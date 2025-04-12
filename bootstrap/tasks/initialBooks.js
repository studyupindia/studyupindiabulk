const { models } = require("../../config/sequelize.config"); // Import Sequelize models
const booksData = require("../../data/studyupindia-prod1.json"); // Import books data file
const constants = require("../../config/constants/default");

/**
 * Initialize Seller Books
 * Populates books for a specific seller from a predefined dataset.
 * Skips duplicates based on unique book codes.
 */
async function intializeDefaultBooks() {
  try {
    const { User, Book } = models; // Destructure the Book and User model from Sequelize models

    console.log("Starting book population for seller...");

    // Seller ID for which the books need to be populated
    // const sellerId = "321fe015-afe2-4991-acd2-af53bee6248d";
    const seller = await User.findOne({
      where: {
        email: constants.DEFAULT_SELLER.email, // Match default seller email
        role: constants.DEFAULT_SELLER.role, // Match default seller role
        publication: constants.DEFAULT_SELLER.publication, // Match publication (e.g., 'NCERT')
        source: constants.DEFAULT_SELLER.source, // Match source (e.g., 'internal', 'external')
        status: constants.DEFAULT_SELLER.status, // Match status (e.g., 'active', 'inactive')
      },
    });
    if(!seller){
      console.log("Default Seller not found. Please create a default seller first");
      throw new Error("Default Seller not found. Please create a default seller first");
    }
    const sellerId = seller.id;
    const publication = seller.publication;

    // Iterate through the books dataset
    for (const bookData of booksData) {
      try {
        // Check if the book already exists for the seller
        const existingBook = await Book.findOne({
          where: {
            code: bookData.code,
            publication: seller.publication,
            sellerId: sellerId,
          },
        });

        if (existingBook) {
          // console.log(`Skipping duplicate book with code: ${bookData.code}`);
          continue; // Skip this book if it already exists
        }

        // Add the sellerId dynamically to the book data
        const newBookData = { ...bookData, publication, sellerId };

        // Create the new book in the database
        await Book.create(newBookData);
        // console.log(`Book '${bookData.title}' added successfully.`);
      } catch (error) {
        console.error(
          `Error processing book with code '${bookData.code}':`,
          error
        );
        throw error; // Propagate the error to stop further processing
      }
    }

    console.log(`Book population for seller completed successfully. Seller Id :  ${sellerId}`);
  } catch (error) {
    console.error("Error initializing seller books:", error);
    throw error; // Propagate the error to stop further tasks
  }
}

module.exports = intializeDefaultBooks; // Export the function for use in the bootstrap script
