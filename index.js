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
        const reviewCollection = client.db('carpentryz').collection('reviews')
        const userCollection = client.db('carpentryz').collection('users')

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

        app.get('/allOrders', async (req, res) => {
            const result = await orderCollection.find().toArray()
            res.send({ success: true, result })
        })

        app.patch('/order/admin/paid/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    confirm: true
                }
            }
            const updatedOrder = await orderCollection.updateOne(filter, updateDoc)
            res.send(updateDoc)
        })

        app.patch('/order/admin/shipped/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    shipping: 'true',
                }
            }
            const updatedOrder = await orderCollection.updateOne(filter, updateDoc)
            res.send(updateDoc)
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
                    pending: true,
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

        app.delete('/order/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(filter)
            res.send({ success: true, result })
        })

        //review
        app.get('/review', async (req, res) => {
            const query = {}
            const result = await reviewCollection.find(query).toArray()
            res.send({ success: true, result })
        })
        app.post('/review', async (req, res) => {
            const review = req.body
            const result = await reviewCollection.insertOne(review)
            res.send({ success: true, result })
        })

        //user
        app.get('/user', async (req, res) => {
            const query = {}
            const allUsers = await userCollection.find(query).toArray()
            res.send({ success: true, allUsers })
            console.log(allUsers)
        })
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email
            console.log(email)
            const query = { email: email }
            console.log(query)
            const result = await userCollection.findOne(query)
            console.log(result)
            res.send({ success: true, result })
        })
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updateDoc, options)
            res.send({ success: true, result })
        })
        //admin
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email
            const user = await userCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin'
            res.send({ success: true, admin: isAdmin })
            console.log(isAdmin)
        })

        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email
            const filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' }
            }
            const result = await userCollection.updateOne(filter, updateDoc)
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