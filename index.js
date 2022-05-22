const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000
app.use(cors())
app.use(express.json())

// pw : vDZGxrn8dT1gJ0tY
//assignment-12

 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.uffti.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {

    try {
      await client.connect();
      const productsCollection = client.db("users").collection("products")
      const reviewCollection = client.db("users").collection("review")
      const userCollection = client.db("users").collection("user")
      console.log('db cnnected');

      //all products
      app.get('/products' , async(req,res)=>{
          const products = await (await productsCollection.find().toArray()).reverse()
          res.send(products)
      })

      //single product  displayed
       app.get('/products/:id', async(req,res)=>{
           const id = req.params.id 
           const query = {_id: ObjectId(id)}
           const result =await productsCollection.findOne(query) 
           res.send(result)

       })

    //   add review on server
    app.post('/review', async(req,res)=>{
        const review = req.body 
        const result =await reviewCollection.insertOne(review) 
        res.send(result)
    })

    //single review show in dislpay
    app.get('/review' , async(req,res)=>{
        const query ={}
        const cursor =  reviewCollection.find(query)
        const result = await cursor.toArray()
        res.send(result)
    })

    //  reg ,login user info
    app.put('/user/:email', async(req,res)=>{
        const email = req.params.email 
        const user = req.body
        const filter = {email:email} 
        const options = { upsert: true };
        const updateDoc = {
            $set: user
          };
          const result = await userCollection.updateOne(filter, updateDoc, options);
          res.send(result)
    })
    
  
    } 
    
    finally {
  
    }
  
  }
  
  run().catch(console.dir);







app.get('/', (req, res) => {
    res.send('Hello from assignment 12')
  })
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })