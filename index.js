const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.SECRET_TOKEN_KEY, function (err, decoded) {
    if (err) {
      res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
};

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pme8g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    // collections

    const partsCollection = client.db("Auto-Motive").collection("Parts");
    const usersCollection = client.db("Auto-Motive").collection("users");
    const ordersCollection = client.db("Auto-Motive").collection("Orders");
    const reviewsCollection = client.db("Auto-Motive").collection("reviews");
    const profilesCollection = client.db("Auto-Motive").collection("profiles");
    const paymentsCollection = client.db("Auto-Motive").collection("payments");

    await client.connect();

    // verify admin

    const verifyAdmin = async (req, res, next) => {
      const requester = req?.decoded?.email;
      const filter = { email: requester };

      const requestAccount = await usersCollection.findOne(filter);

      if (requestAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden Access" });
      }
    };

    // all API for parts
    app.get("/parts", async (req, res) => {
      const parts = (await partsCollection.find().toArray()).reverse();
      res.send(parts);
    });

    app.get("/parts/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await partsCollection.findOne(query);
      res.send(part);
    });

    app.put("/parts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const newQuantity = req.body.availableQuantity;
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          availableQuantity: newQuantity,
        },
      };
      const result = await partsCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    app.post("/parts", async (req, res) => {
      const product = req.body;
      await partsCollection.insertOne(product);
      res.send({ success: true, message: "Product added" });
    });
    app.delete("/parts/:id", async (req, res) => {
      const id = req.params.id;
      await partsCollection.deleteOne({ _id: ObjectId(id) });
    });

    // all API for order

    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    app.get("/allOrder", verifyJWT, async (req, res) => {
      const allOrder = await ordersCollection.find({}).toArray();
      res.send(allOrder);
    });

    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const order = await ordersCollection.findOne({ _id: ObjectId(id) });

      res.send(order);
    });

    app.put("/order/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: ObjectId(id) };
      const newStatus = req.body.pending;

      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: newStatus,
        },
      };
      const result = await ordersCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const transactionId = payment.payment.transactionId;
      const updatedDoc = {
        $set: {
          paid: true,
          status: "pending",
          transactionId: transactionId,
        },
      };
      await paymentsCollection.insertOne(payment);
      await ordersCollection.updateOne(filter, updatedDoc);
      res.send(updatedDoc);
    });

    // POST API for payment gateway

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.get("/order", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded?.email;
      if (email === decodedEmail) {
        const orders = await ordersCollection.find({ email: email }).toArray();
        res.send(orders);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      await ordersCollection.deleteOne({ _id: ObjectId(id) });
    });

    // all API for review
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });
    app.get("/review", async (req, res) => {
      const reviews = (await reviewsCollection.find().toArray()).reverse();
      res.send(reviews);
    });

    // all API my profile
    app.post("/myProfile", async (req, res) => {
      const profile = req.body;
      const result = await profilesCollection.insertOne(profile);
      res.send(result);
    });
    app.get("/myProfile/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      const result = await profilesCollection.find({ email: email }).toArray();
      res.send(result);
    });

    app.get("/myProfile/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const result = await profilesCollection.findOne({ _id: ObjectId(id) });
      res.send(result);
    });

    app.patch("/myProfile/:id", async (req, res) => {
      const id = req.params.id;
      const profile = req.body;
      const newProfile = profile.profileInfo;
      const name = newProfile.name;
      const email = newProfile.email;
      const education = newProfile.education;
      const district = newProfile.district;
      const city = newProfile.city;
      const linkedin = newProfile.linkedin;
      const github = newProfile.github;
      const phone = newProfile.phone;

      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: name,
          email: email,
          education: education,
          district: district,
          city: city,
          linkedin: linkedin,
          github: github,
          phone: phone,
        },
      };
      if (
        !name ||
        !email ||
        !education ||
        !district ||
        !city ||
        !linkedin ||
        !github ||
        !phone
      ) {
        return res.send({
          success: false,
          error: "Please provide all information",
        });
      }

      await profilesCollection.updateOne(filter, updatedDoc);

      res.send({ success: true, message: "Profile Updated" });
    });

    // user api
    app.get("/user", verifyJWT, async (req, res) => {
      const user = await usersCollection.find().toArray();
      res.send(user);
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;

      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(
        { email: email },
        updateDoc
      );

      res.send(result);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        { email: email },
        updateDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.SECRET_TOKEN_KEY, {
        expiresIn: "7d",
      });
      res.send({ result, token });
    });
  } catch (error) {
    console.log(error);
  }
};

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Automotive Server is Running");
});

app.listen(port, () => {
  console.log(`Automotive app listening on Port ${port}`);
});
