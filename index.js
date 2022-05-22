const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
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

    await client.connect();

    app.get("/parts", async (req, res) => {
      const parts = await partsCollection.find().toArray({});
      res.send(parts);
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
