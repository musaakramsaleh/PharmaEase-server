const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000
const corsOption = {
    origin:['http://localhost:5173'],
    credentials: true,
    optionSuccessStatus: 200,
}
const app = express()
app.use(cors(corsOption))
app.use(express.json())
// varSWDbIN8UUvqj3

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.zuwbcyf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  const database = client.db("PharmacyDb");
  const productCollection = database.collection("product");
  const categoryCollection = database.collection("category");
  app.get('/products', async(req,res)=>{
    const category = req.query.category
    let query = {}
    if(category) query = {category}
    const result = await productCollection.find(query).toArray()
    res.send(result)
  })
  app.get('/category', async(req,res)=>{
    const result = await categoryCollection.find().toArray()
    res.send(result)
  })
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
    res.send("Vaaiya tomar server medicine kiner jonno ready")
})

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`)
})
