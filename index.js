const express = require('express');
const app = express('');
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const port = process.env.PORT || 5000
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)


app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PAS}@cluster0.5zgoy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect()

        const productCollection = client.db('carpentryz').collection('products')
        const orderCollection = client.db('carpentryz').collection('orders')
        const paymentCollection = client.db('carpentryz').collection('payments')

        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body
            console.log(price)
            const amount = price
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        app.get('/products', async (req, res) => {
            const query = {}
            const products = await productCollection.find(query).limit(6).toArray()
            res.send({ success: true, products })
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id
            console.log(id)
            const query = { _id: ObjectId(id) }
            const result = await productCollection.findOne(query)
            res.send({ success: true, result })
        })

        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id
            const quantity = req.body
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    availableQuantity: quantity.newQuantity
                }
            }
            const result = await productCollection.updateOne(filter, updateDoc)
            res.send({ success: true, result, updateDoc })
            console.log(result, updateDoc)
        })

        // adding a product
        app.post('/products', async (req, res) => {
            const product = req.body
            const result = await productCollection.insertOne(product)
            res.send({ success: true, result, product })
        })

        //order
        app.get('/order', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await orderCollection.find(query).toArray()
            res.send({ success: true, result })
            console.log(result)
        })

        app.get('/order/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.findOne(query)
            res.send({ success: true, result })
        })

        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id
            const payment = req.body
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment)
            const updatedOrder = await orderCollection.updateOne(filter, updateDoc)
            res.send(updateDoc)
        })

        app.post('/order', async (req, res) => {
            const order = req.body
            const result = await orderCollection.insertOne(order)
            res.send({ success: true, result, order })
        })

        app.delete('/order/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await orderCollection.deleteOne(query)
            res.send({ success: true, result })
        })
    }
    finally {

    }

}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Carpentryz is running')
})

app.listen(port, () => {
    console.log(`Carpentryz listening on port ${port}`)
})