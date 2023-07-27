const express = require("express");
const app = express("");
const cors = require("cors");
require("dotenv").config();
jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PAS}@cluster0.5zgoy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();

    const productCollection = client.db("carpentryz").collection("products");
    const orderCollection = client.db("carpentryz").collection("orders");
    const paymentCollection = client.db("carpentryz").collection("payments");
    const reviewCollection = client.db("carpentryz").collection("reviews");
    const userCollection = client.db("carpentryz").collection("users");
    const messageCollection = client.db("carpentryz").collection("messages");

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      console.log(price);
      const amount = price;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden" });
      }
    };

    app.get("/products", async (req, res) => {
      const products = await productCollection.find({}).limit(6).toArray();
      res.send({ success: true, products });
    });
    app.get("/allProducts", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send({ success: true, result });
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send({ success: true, result });
    });

    app.patch("/products/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const quantity = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          availableQuantity: quantity.newQuantity,
        },
      };
      const result = await productCollection.updateOne(filter, updateDoc);
      res.send({ success: true, result, updateDoc });
    });

    // adding a product
    app.post("/products", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send({ success: true, result, product });
    });

    app.delete(
      "/deleteProducts/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const result = await productCollection.deleteOne(filter);
        res.send({ success: true, result });
      }
    );

    //order
    app.get("/order", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await orderCollection.find(query).toArray();
      res.send({ success: true, result });
    });

    app.get("/allOrders", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await orderCollection.find().toArray();
      res.send({ success: true, result });
    });

    app.patch("/order/admin/paid/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          confirm: true,
        },
      };
      const updatedOrder = await orderCollection.updateOne(filter, updateDoc);
      res.send(updateDoc);
    });

    app.patch("/order/admin/shipped/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          shipping: "true",
        },
      };
      const updatedOrder = await orderCollection.updateOne(filter, updateDoc);
      res.send(updateDoc);
    });

    app.get("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send({ success: true, result });
    });

    app.patch("/order/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          pending: true,
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollection.updateOne(filter, updateDoc);
      res.send(updateDoc);
    });

    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send({ success: true, result, order });
    });

    app.delete("/order/user/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(filter);
      res.send({ success: true, result });
    });

    app.delete("/order/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(filter);
      res.send({ success: true, result });
    });

    //review
    app.get("/review", async (req, res) => {
      const query = {};
      const result = await reviewCollection.find(query).toArray();
      res.send({ success: true, result });
    });
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send({ success: true, result });
    });

    //user
    app.get("/user", verifyJWT, async (req, res) => {
      const allUsers = await userCollection.find().toArray();
      res.send({ success: true, allUsers });
    });
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send({ success: true, result });
    });
    app.put("/user/profile/:email", async (req, res) => {
      const email = req.params.email;
      const userDetails = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: userDetails,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send({ success: true, result });
    });
    app.put("/user/create/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: { user },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "7d",
        }
      );
      res.send({ result, token });
    });

    app.delete(
      "/admin/delete/:email",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const result = await userCollection.deleteOne(filter);
        res.send({ success: true, result });
      }
    );
    //admin
    app.get("/admin/allUsers", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send({ success: true, result });
    });
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ success: true, admin: isAdmin });
    });

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send({ success: true, result });
    });

    app.post("/contact", async (req, res) => {
      const message = req.body;
      const result = await messageCollection.insertOne(message);
      res.send({ success: result, result });
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Carpentryz is running");
});

app.listen(port, () => {
  console.log(`Carpentryz listening on port ${port}`);
});
