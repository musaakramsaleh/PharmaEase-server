const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_KEY);
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



async function run() {
  try {
    await client.connect();
    const database = client.db("PharmacyDb");
    const userCollection = database.collection("users");
    const productCollection = database.collection("product");
    const categoryCollection = database.collection("category");
    const cartCollection = database.collection("cart");
    const paymentCollection = database.collection("payment");

    app.post('/jwt',async(req,res)=>{
      const user = req.body
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: '6h'});
        res.send({token});
    })
    const verifyToken = (req,res,next)=>{
      console.log("token ache ", req.headers.authorization)
      if(!req.headers.authorization){
        return res.status(401).send({message:'Forbidden Access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
        if(err){
          return res.status(401).send({message:'Forbidden Access'})
        }
        req.decoded = decoded
        next();
      }) 
    }
    app.get('/users',verifyToken,async (req,res)=>{
      console.log(req.headers)
      const result = await userCollection.find().toArray()
      res.send(result)
    })
    app.get('/users/admin/:email',verifyToken,async (req,res)=>{
      const email = req.params.email
      if(email !== req.decoded.email){
        return res.status(403).send({message:'unauthorized access'})
      }
      const query = {email: email}
      const user = await userCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({admin})
    })
    app.get('/users/seller/:email',verifyToken,async (req,res)=>{
      const email = req.params.email
      if(email !== req.decoded.email){
        return res.status(403).send({message:'unauthorized access'})
      }
      const query = {email: email}
      const user = await userCollection.findOne(query)
      let seller = false;
      if (user) {
        admin = user?.role === 'seller';
      }
      res.send({admin})
    })
    app.post('/user',async(req,res)=>{
      const user = req.body
      const query = {email:user.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message:'User is there already',insertedID:null})
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })
    app.get('/all-medicine',async(req,res)=>{
      const size = parseInt(req.query.size)
      const page = parseInt(req.query.page) -1 
      const search = req.query.search
       let query = { FoodName: { $regex: search, $options: 'i' } }
      
      const result = await userCollection.find(query).skip(page*size).limit(size).toArray()
      res.send(result)
      
    })
    app.post('/product',verifyToken, async (req, res) => {
      const product = req.body;
  
      try {
         
          const result = await productCollection.insertOne(product);
  
          
          const existingCategory = await categoryCollection.findOne({ category: product.category });
  
          if (existingCategory) {
              
              await categoryCollection.updateOne(
                  { _id: existingCategory._id },
                  { $inc: { quantity: 1 } }
              );
          } 
          res.send(result)
      } catch (error) {
          console.error('Error adding product:', error);
          res.status(500).json({ error: 'Internal server error' });
      }
  });
  
    app.get('/products', async (req, res) => {
      const category = req.params.category;
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || '';
      const sortDirection = req.query.sort === 'desc' ? -1 : req.query.sort === 'asc' ? 1 : null;
  
      // Calculate skip and limit based on page and size
      const skip = (page - 1) * size;
      const limit = size;
  
      try {
          const query = {
              $or: [
                  { itemName: { $regex: search, $options: 'i' } },
                  { itemGenericName: { $regex: search, $options: 'i' } },
                  { company: { $regex: search, $options: 'i' } }
              ]
          };
  
          let sortObject = null;
          if (sortDirection !== null) {
              sortObject = { perUnitPrice: sortDirection };
          }
  
          const result = await productCollection
              .find(query)
              .sort(sortObject)
              .skip(skip)
              .limit(limit)
              .toArray();
  
          const count = await productCollection.countDocuments(query);
          res.send({ medicines: result, count });
      } catch (error) {
          console.error('Error fetching products:', error);
          res.status(500).send('Error fetching products');
      }
    });
    app.get('/product/:email',verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { 'owner.email': email };
      console.log("Executing query:", query);
      const result = await productCollection.find(query).toArray();
      res.send(result)      
  });
  app.put('/product/:id',verifyToken, async (req, res) => {
    const id = req.params.id;
    const updateData = req.body;

    try {
        const result = await productCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        res.status(200).json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
    app.get('/category', async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });
    app.get('/products/:category', async (req, res) => {
      const category = req.params.category;
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || '';
      const sortDirection = req.query.sort === 'desc' ? -1 : req.query.sort === 'asc' ? 1 : null;
  
      // Calculate skip and limit based on page and size
      const skip = (page - 1) * size;
      const limit = size;
  
      try {
          const query = {
              category: category,
              $or: [
                  { itemName: { $regex: search, $options: 'i' } },
                  { itemGenericName: { $regex: search, $options: 'i' } },
                  { company: { $regex: search, $options: 'i' } }
              ]
          };
  
          let sortObject = null;
          if (sortDirection !== null) {
              sortObject = { perUnitPrice: sortDirection };
          }
  
          const result = await productCollection
              .find(query)
              .sort(sortObject)
              .skip(skip)
              .limit(limit)
              .toArray();
  
          const count = await productCollection.countDocuments(query);
          res.send({ medicines: result, count });
      } catch (error) {
          console.error('Error fetching products:', error);
          res.status(500).send('Error fetching products');
      }
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
app.delete('/carts', async (req, res) => {
  const email = req.query.email; // Assuming user email is passed in the query
  const filter = { usercart: email };
  const result = await cartCollection.deleteMany(filter);
  res.send(result);
});
app.post('/create-payment-intent',async(req,res)=>{
  const {price} = req.body
  const amount = parseInt(price * 100)

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
  })
  res.send({
    clientSecret: paymentIntent.client_secret
  })
})
app.post('/payments',async (req,res)=>{
  const payment = req.body
  const result = paymentCollection.insertOne(payment)
  const email = req.body.email; 
  const filter = { usercart: email };
  const clear = await cartCollection.deleteMany(filter)
  res.send({result,clear})
})
app.get('/payments/:transactionid',async (req,res)=>{
  const transactionid = req.params.transactionid
  const filter = { transaction: transactionid };
    const result = await paymentCollection.find(filter).toArray();
    res.send(result);
})


  app.get('/payments', async (req, res) => {
    const search = req.query.search || '';
    const sortDirection = req.query.sort === 'desc' ? -1 : req.query.sort === 'asc' ? 1 : null;


    try {
        const query = {
            $or: [
                { "items.name": { $regex: search, $options: 'i' } },
                { itemOwner: { $regex: search, $options: 'i' } },
                { status: { $regex: search, $options: 'i' } }
            ]
        };

        let sortObject = null;
        if (sortDirection !== null) {
            sortObject = { price: sortDirection };
        }

        const result = await paymentCollection.find(query).sort(sortObject).toArray();
        res.send(result);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products');
    }
  }); 
app.patch('/payments/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
          $set: { status: "paid" },
      };
      const result = await paymentCollection.updateOne(filter, updateDoc);
      res.send(result);
  });
  app.patch('/users/:email', async (req, res) => {
    const email = req.params.email;
    const { role } = req.body;
    const filter = { email: email };
    const updateDoc = {
        $set: { role: role },
    };
    const result = await userCollection.updateOne(filter, updateDoc);
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