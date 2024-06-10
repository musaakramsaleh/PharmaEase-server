const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const corsOption = {
    origin: ['http://localhost:5173'],
    credentials: true,
    optionSuccessStatus: 200,
};

const app = express();
app.use(cors(corsOption));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.zuwbcyf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let productCollection;
let categoryCollection;
let cartCollection;

async function run() {
  try {
    await client.connect();
    const database = client.db("PharmacyDb");
    productCollection = database.collection("product");
    categoryCollection = database.collection("category");
    cartCollection = database.collection("cart");

    app.get('/products', async (req, res) => {
      const category = req.query.category;
      let query = {};
      if (category) query = { category };
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/category', async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const { email, name, owner, price, company,menu_id } = req.body;
      const query = { menu_id: menu_id };
      const existingItem = await cartCollection.findOne(query);
  
      if (existingItem) {
          // If item exists, increase the quantity
          const updateResult = await cartCollection.updateOne(query, { $inc: { quantity: 1 } });
          res.send(updateResult);
      } else {
          // If item does not exist, add it with quantity 1
          const newItem = req.body;
          const insertResult = await cartCollection.insertOne(newItem);
          res.send(insertResult);
      }
  });
    app.get('/cart',async(req,res)=>{
      const email = req.query.email
      console.log(email)
      const query = {usercart: email}
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })
    app.patch('/cart/:id', async (req, res) => {
      const id = req.params.id;
      const { quantity } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
          $set: { quantity: quantity },
      };
      const result = await cartCollection.updateOne(filter, updateDoc);
      res.send(result);
  });
  app.delete('/cart/:id', async (req, res) => {
    const email = req.params.id; // Assuming user email is passed in the query
    const filter = { _id: new ObjectId(email) };
    const result = await cartCollection.deleteOne(filter);
    res.send(result);
});
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("Vaaiya tomar server medicine kiner jonno ready");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});