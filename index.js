const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

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
    const ordersCollection = client.db("Auto-Motive").collection("Orders");
    const reviewsCollection = client.db("Auto-Motive").collection("reviews");
    const profilesCollection = client.db("Auto-Motive").collection("profiles");

    await client.connect();

    // all API for parts
    app.get("/parts", async (req, res) => {
      const parts = (await partsCollection.find().toArray()).reverse();
      res.send(parts);
    });

    app.get("/parts/:id", async (req, res) => {
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
    app.get("/order", async (req, res) => {
      const email = req.query.email;
      const orders = await ordersCollection.find({ email: email }).toArray();
      res.send(orders);
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
    app.get("/myProfile", async (req, res) => {
      const result = await profilesCollection.find().toArray();
      res.send(result);
    });

    app.get("/myProfile/:id", async (req, res) => {
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

      const result = await profilesCollection.updateOne(filter, updatedDoc);

      res.send({ success: true, message: "Profile Updated" });
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
