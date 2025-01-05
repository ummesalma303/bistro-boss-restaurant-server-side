const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000
//middleware
app.use(cors())
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ot76b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");




    const menuCollection = client.db("bistroDb").collection("menu");
    const reviewCollection = client.db("bistroDb").collection("reviews");
    const cartCollection = client.db("bistroDb").collection("carts");
    const userCollection = client.db("bistroDb").collection("users");



    /* ---------------------------------- users --------------------------------- */
    app.post('/users',async (req,res)=>{
      const users = req.body
      const result = await userCollection.insertOne(users);
      console.log(result)
      res.send(result)
    })




    /* ---------------------------------- menu ---------------------------------- */
    app.get('/menu',async(req,res)=>{
    const result =await menuCollection.find().toArray();
    res.send(result)
    })

    app.get('/reviews',async(req,res)=>{
    const result =await reviewCollection.find().toArray();
    res.send(result)
    })


    app.get('/carts/:email',async(req,res)=>{
      const email = req.params.email
      // console.log(email)
      const filter = {email:email}
      const result = await cartCollection.find(filter).toArray();
      // console.log('line 55',result)
      res.send(result)
    })
    

    app.post('/cart',async (req,res)=>{
      const cart = req.body
      const result = await cartCollection.insertOne(cart);
      console.log(result)
      res.send(result)
    })

    app.delete('/cart/:id',async(req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);








app.get('/',(req,res)=>{
    res.send("boss is sitting")
})
app.listen(port, () => {
    console.log(`Bistro boss is sitting on port ${port}`);
})