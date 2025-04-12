const { models } = require("../../config/sequelize.config"); // Import Sequelize models
const booksData = require("../../data/ncert_bulk.json"); // Import books data file

/**
 * Initialize Seller Books
 * Populates books for a specific seller from a predefined dataset.
 * Skips duplicates based on unique book codes.
 */
async function intializeTest() {
  try {
    const { Book, User } = models; // Destructure the Book model from Sequelize models

    // console.log("Starting book population for seller...");

    // Seller ID for which the books need to be populated
    const sellerId = "321fe015-afe2-4991-acd2-af53bee6248d";

    // const existingBooks = await Book.findAll({
    //   where: {
    //     sellerId,
    //   },
    // });
    // console.log(existingBooks.length);

    const oneBook = await Book.findOne({
        where: {
            code: '12095'
        },
        attributes: ['code', 'publication', 'title','price', 'type', 'language', 'class'],
        include:{
            model: User,
            as : 'Seller',
            attributes: ['name', 'email']
        } 
    })
    // console.log(oneBook.toJSON());
  } catch (error) {
    console.error("Error initializing seller books:", error);
    throw error; // Propagate the error to stop further tasks
  }
}

module.exports = intializeTest; // Export the function for use in the bootstrap script
