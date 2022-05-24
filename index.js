const express = require('express');
const app = express('');
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PAS}@cluster0.5zgoy.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect()

        const productCollection = client.db('carpentryz').collection('products')

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
            console.log(result)
        })

        // adding a product
        app.post('/products', async (req, res) => {
            const product = req.body
            const result = await productCollection.insertOne(product)
            res.send({ success: true, result, product })
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