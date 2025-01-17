const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000
//middleware
app.use(cors({
  origin: 'http://localhost:5173'
}))
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
    const paymentCollection = client.db("bistroDb").collection("payments");


    /* ----------------------------------- jwt ---------------------------------- */
    app.post('/jwt',async (req,res) => {
      const user = req.body
      const token = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' });
      res.send({token})
    })

 // middlewares 
 const verifyToken = (req, res, next) =>{
  // console.log('verifyToken')
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
     if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
     }
     req.decoded = decoded
     next()
  });
 }
 const verifyAdmin = async (req, res, next) =>{
  const email = req.decoded.user.email
  const query = {email:email}
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  
  if (!isAdmin) {
    return res.status(403).send({ message: 'forbidden access' })
  }
  // res.send()
  next()
 }

  /* ---------------------------------- admin --------------------------------- */
  app.get('/users/admin/:email',verifyToken,verifyAdmin,async (req,res) =>{
    const email = req.params.email
    // console.log('88======',req.decoded.email)
    if (email === req.decoded.email) {
      return res.status(403).send({ message: 'forbidden access' })
    }

    const query = {email: email}
    const user = await userCollection.findOne(query) 
    let admin = false
    if (user) {
      admin= user?.role === 'admin'
    }
    res.send({admin})
  })
  
  app.patch('/users/admin/:id',verifyToken,verifyAdmin,async (req,res)=>{
    const id = req.params.id
    const filter ={_id: new ObjectId(id)}
    const updateDoc = {
      $set:{
        role: 'admin'
      }
    }
    const result = await userCollection.updateOne(filter,updateDoc)
    res.send(result)
  })
    /* ---------------------------------- users --------------------------------- */
    app.get('/users',verifyToken,verifyAdmin,async(req,res)=>{
      // console.log(req.headers.authorization)
      const result = await userCollection.find().toArray();
      res.send(result)
      })

    app.post('/users',async (req,res)=>{
      const users = req.body
      const result = await userCollection.insertOne(users);
      res.send(result)
    })
    app.delete('/users/:id',async(req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })
    
   

    /* ---------------------------------- menu ---------------------------------- */
    app.get('/menu',async(req,res)=>{
    const result =await menuCollection.find().toArray();
    res.send(result)
    })

    app.get('/singleMenu/:id',async(req,res) =>{
      const id = req.params.id
      // console.log("137",id)
      const query = {_id: id}
      // console.log('139------',query)
      const result = await menuCollection.findOne(query);
      // console.log(result)
      res.send(result)
    })


    app.post('/menu',verifyToken,verifyAdmin,async(req,res)=>{
      const menu = req.body;
      const result = await menuCollection.insertOne(menu)
      res.send(result)
    })

    app.delete('/menu/:id',async(req,res) =>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await menuCollection.deleteOne(query)
      res.send(result)
    })
    app.patch('/menu/:id',async(req,res) =>{
      const item = req.body
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const updateDoc ={
       $set:{
         name: item.name,
        category: item.category,
        price: item.price,
        recipe: item.recipe,
        image: item.image
      }
      }
      const result = await menuCollection.updateOne(query,updateDoc)
      res.send(result)
    })

    /* -------------------------------------------------------------------------- */

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

    /* --------------------------------- stripe payment --------------------------------- */

    app.post('/create-payment-intent',async (req,res) => {
     const {price} = req.body;
     const amount = parseInt(price * 100)
     const paymentIntent = await stripe.paymentIntents.create({
       amount: amount,
       currency: "usd",
       payment_method_types: ['card']
      })
      // console.log('222',paymentResult)
      res.send({ clientSecret: paymentIntent.client_secret,})
    })


    app.get('/payment/:email',verifyToken,async (req,res)=>{
      const email = req.params.email
      // console.log(email)
      // console.log(req.decoded.email)
      if (email !== req.decoded.user.email) {
        return res.status(403).send({ message: 'forbidden access'});
      }
      const query = {email}
      const result = await paymentCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/payment',async(req,res)=>{
     const data = req.body
     console.log(data)
     const paymentResult = await paymentCollection.insertOne(data)
     console.log(paymentResult)
      // const query = {_id:{$in:data.cartIds.map(id => new ObjectId(id))}}

      const query = {
        _id: {
          $in: data.cartIds.map(id => new ObjectId(id))
        }
      };
      const deleteResult = await cartCollection.deleteMany(query)
      res.status(200).send({paymentResult,deleteResult})
    })

    /* --------------------------- stats or analytics --------------------------- */
     // using aggregate pipeline
    app.get('/order-stats',async (req,res) => {
      const result = await paymentCollection.aggregate([
        {$unwind:'$menuId'},
        {
          $lookup:{
            from:'menu',
            localField:'menuId',
            foreignField:'_id',
            as: 'menuItems'
          }
        },
        {$unwind:'$menuItems'},
        {$group:{
          _id:'$menuItems.category',
          quantity:{$sum:1},
          revenue: {$sum: '$menuItems.price'} 
        }},
        {
          $project:{
            _id:0,
            category:"$_id",
            quantity:"$quantity",
          revenue:'$revenue'
          }
        }
      ]).toArray()

      res.send(result)
    })
    app.get('/admin-stats',async(req,res)=>{
      const user = await userCollection.estimatedDocumentCount()
      const product = await menuCollection.estimatedDocumentCount()
      const order = await paymentCollection.estimatedDocumentCount()

      // this is not the best way
      // const payments = await paymentCollection.find().toArray()
      // const revenue =  payments.reduce((total,payment)=>total + payment.price,0)
      const result = await paymentCollection.aggregate([
        {
          $group:{
            _id:null,
            totalRevenue:{
              $sum:'$price'
            }
          }
        }
      ]).toArray()
      const revenue = result?.length > 0 ? result[0].totalRevenue :0
      res.send({user,product,order,revenue})
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