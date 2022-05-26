const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000
app.use(cors())
app.use(express.json())
const stripe = require('stripe')(process.env.STRIPE_KEY)


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.uffti.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

 
function verifyJWT(req,res,next){
  const authHeader  = req.headers.authorization 
  if(!authHeader){
    return res.status(401).send({message:'Unauthrized access'})
  }
  const token = authHeader.split(' ')[1]

  jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded) {
    if(err){
      return res.status(403).send({message:'Forbiden access'})
    }
   req.decoded = decoded
   next()
  });
}


async function run() {

    try {
      await client.connect();
      const productsCollection = client.db("users").collection("products")
      const reviewCollection = client.db("users").collection("review")
      const userCollection = client.db("users").collection("user")
      const myProfilCollection = client.db("users").collection("myprofil")
      const orderCollection = client.db("users").collection("order")
      const paymentCollection = client.db("users").collection("payment")
      console.log('db cnnected');

       
    //   const verifyAdmin =async(req,res,next)=>{
    //     const requester = req.decoded.email
    //     const requesterAccount= await userCollection.findOne({email:requester})
    //     if(requesterAccount.role === 'admin'){
    //       next()
    //     }
    //     else{
    //      res.status(403).send({message:'Forbiden access'})
    //     }
    // }



      //all products
      app.get('/products' , async(req,res)=>{
          // const products = await  productsCollection.find().toArray()
          // res.send(products)

          const query = {};
            const cursor = productsCollection.find(query);
            const result = (await cursor.toArray()).reverse()
            res.send(result)
      })

      //add products server 
        app.post('/products' , async(req,res)=>{
          const product = req.body 
          const result = await productsCollection.insertOne(product) 
          res.send(result)
        })
  

        //payment 
        app.post('/create-payment-intent',verifyJWT , async(req,res)=>{
          const service = req.body 
          const price = service.price 
          const amount = price*100 
          const paymentIntent = await stripe.paymentIntents.create({
            amount : amount,
            currency: 'usd',
            payment_method_types:['card']
          })
          res.send({clientSecret: paymentIntent.client_secret})
        })

       // sent order to server
       app.post('/orders', async(req,res)=>{
         const myorder= req.body 
         const result = await orderCollection.insertOne(myorder) 
         res.send(result)
       })

      // all order show in website

      app.get('/orders', async(req,res)=>{
        const order = await orderCollection.find().toArray()
        res.send(order)
      })

        app.get('/orders/:id', async(req,res)=>{
          const id = req.params.id 
          const query = {_id:ObjectId(id)}
          const order = await orderCollection.findOne(query) 
          res.send(order)
        })

       app.get('/myorders' , async(req,res)=>{
         const email = req.query.email 
         const query = {email: email}
         const cursor = orderCollection.find(query)
         const result = await cursor.toArray()
         res.send(result)
       })


       //save transitaion id by payment 
       app.patch('/orders/:id', verifyJWT, async(req,res)=>{
         const id = req.params.id 
         const payment = req.body 
         const filter = {_id: ObjectId(id)} 
         const updateDoc = {
           $set: {
              paid: true ,
              transactionId : payment.transactionId ,

           }
         }
         const updateOrder = await orderCollection.updateOne(filter , updateDoc) 
         const result = await paymentCollection.insertOne(payment) 
         res.send(updateDoc)
       })

        //delete my order
      app.delete('/myorders/:id',verifyJWT, async(req,res)=>{
        const id = req.params.id 
        const query = {_id: ObjectId(id)}
        const result = await orderCollection.deleteOne(query) 
        res.send(result)
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
          const token = jwt.sign({email:email} , process.env.ACCESS_TOKEN ,  { expiresIn: '1h' })
          res.send({result, token})
    })
    //load all users
    app.get('/user' , async(req,res)=>{
      const users = await userCollection.find().toArray()
      res.send(users)
    })


    //admin get
    app.get('/admin/:email',async(req,res)=>{
      const email = req.params.email 
      const user = await userCollection.findOne({email:email}) 
      const isAdmin = user.role === 'admin'
     res.send({admin:isAdmin})
    })
//admin role

app.put('/user/admin/:email',verifyJWT, async(req,res)=>{
  const email = req.params.email 
  const requester = req.decoded.email 
  const requesterAccount = await userCollection.findOne({email:requester})  
  if(requesterAccount.role === 'admin' ){
      const filter ={email: email} 
      const options = { upsert: true };
      const updateDoc = {
          $set: {role:'admin'}
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result)
  }
   else{
     res.status(403).send({message: 'forbiden access'})
   }
 
})

   //delete product by admin
   app.delete('/products/:id',verifyJWT, async(req,res)=>{
     const id = req.params.id 
     const query = {_id: ObjectId(id)}
     const result = await productsCollection.deleteOne(query) 
     res.send(result)
   })


    //my profil add to server
     app.post('/myprofil' , async(req,res)=>{
       const profil = req.body 
       const result = await myProfilCollection.insertOne(profil) 
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