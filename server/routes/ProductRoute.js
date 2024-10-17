import express from "express";
import axios from "axios";
import ProductModel from "../models/Product.js";

const ProductRoute = express.Router();

ProductRoute.get("/seed", async (req, res) => {
  try {
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    const products = response.data;
    await ProductModel.insertMany(products);
    res
      .status(200)
      .json({ success: true, message: "Data seeded successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error seeding data", error });
  }
});

ProductRoute.get("/transactions", async (req, res) => {
  try {
    const { month, search = "", page = 1, perPage = 10 } = req.query;
    const monthNumber = new Date(`${month} 1`).getMonth() + 1;

    // Create search filter
    const searchFilter = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            // For price, assuming exact match or range query:
            { price: isNaN(search) ? undefined : search }, // Only search by price if it's a number
          ].filter(Boolean), // Filter out undefined fields
        }
      : {};

    // Pagination calculations
    const skip = (page - 1) * parseInt(perPage);

    // Find matching transactions
    const transactions = await ProductModel.find({
      ...searchFilter,
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
    })
      .skip(skip)
      .limit(parseInt(perPage));

    // Count total matching documents for pagination
    const total = await ProductModel.countDocuments({
      ...searchFilter,
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
    });

    const totalPages = Math.ceil(total / parseInt(perPage));

    res.status(200).json({
      success: true,
      transactions,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching transactions", error);
    res.status(500).json({
      success: false,
      error: "Error fetching transactions",
    });
  }
});

ProductRoute.get("/statistics", async (req, res) => {
  const { month } = req.query;
  const monthNumber = new Date(`${month} 1`).getMonth() + 1;
  try {
    const totalSales = await ProductModel.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
          sold: true,
        },
      },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);
    const totalSoldItems = await ProductModel.countDocuments({
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
      sold: true,
    });
    const totalUnsoldItems = await ProductModel.countDocuments({
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
      sold: false,
    });
    res.status(200).json({
      success: true,
      totalSaleAmount: totalSales[0]?.total || 0,
      totalSoldItems,
      totalUnsoldItems,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Error fetching statistics" });
  }
});

ProductRoute.get("/bar-chart", async (req, res) => {
  const { month } = req.query;
  const monthNumber = new Date(`${month} 1`).getMonth() + 1;
  try {
    const priceRanges = await ProductModel.aggregate([
      {
        $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] } },
      },
      {
        $bucket: {
          groupBy: "$price", // Field to group by
          boundaries: [
            0,
            100,
            200,
            300,
            400,
            500,
            600,
            700,
            800,
            900,
            Infinity,
          ],
          default: "901-above",
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);
    res.status(200).json({ success: true, priceRanges });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Error fetching price range data" });
  }
});

ProductRoute.get("/pie-chart", async (req, res) => {
  const { month } = req.query;
  const monthNumber = new Date(`${month} 1`).getMonth() + 1;
  try {
    const categories = await ProductModel.aggregate([
      {
        $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] } },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);
    res.status(200).json({ success: true, categories });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error fetching category distribution data",
    });
  }
});

ProductRoute.get("/combined-report", async (req, res) => {
  const { month } = req.query;
  try {
    const [statistics, barChart, pieChart] = await Promise.all([
      axios.get(`http://localhost:8080/api/v1/statistics?month=${month}`),
      axios.get(`http://localhost:8080/api/v1/bar-chart?month=${month}`),
      axios.get(`http://localhost:8080/api/v1/pie-chart?month=${month}`),
    ]);
    res.status(200).json({
      success: true,
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error combining reports" });
  }
});

export default ProductRoute;
