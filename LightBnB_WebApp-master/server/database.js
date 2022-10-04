const properties = require('./json/properties.json');
const users = require('./json/users.json');

const { Pool } = require('pg');
const { query } = require('express');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  let queryString = `SELECT *
  FROM users
  WHERE email = $1
  LIMIT 1
  `;

  return pool
    .query(queryString, [email.toLocaleLowerCase()])
    .then(res => {
      if (res.rows[0] === undefined) return null;
      else return res.rows[0]
    })
    .catch(e => console.error('query error ', e.stack))
}

exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {

  let queryString = `SELECT *
  FROM users
  WHERE id = $1
  LIMIT 1
  `;

  return pool
    .query(queryString, [id])
    .then(res => {
      return res.rows[0]
    })
    .catch(e => console.error('query error ', e.stack))
}

exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {

  const queryString = `INSERT INTO users
  (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING* ;
  `;

  const values = [user.name, user.email, user.password]
  return pool
    .query(queryString, values)
    .then(res => {
      console.log('new user', res.rows[0]);
      return res.rows[0]
    })
    .catch(e => console.error('query error ', e.stack))
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `SELECT
  reservations. *,
  properties. *,
  AVG(property_reviews.rating) AS average_rating
FROM
  properties
  JOIN reservations ON properties.id = property_id
  JOIN property_reviews ON property_reviews.property_id = properties.id
WHERE
  reservations.guest_id = $1
GROUP BY
  reservations.id,
  properties.id
ORDER BY
  start_date
LIMIT
  $2
  `;
  const values = [guest_id, limit]

  return pool
    .query(queryString, values)
    .then(res => {
      //console.log(res.rows);
      return res.rows
    })
    .catch(e => {
      console.error('query error ', e.stack);
    });
  //return getAllProperties(null, 2);
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */


const getAllProperties = function (options, limit = 10) {

  //Start the query with all information that comes before the WHERE clause.
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  const values = []; //Setup an array to hold any parameters that may be available for the query.

  //Check if a city has been passed in as an option. Add the city to the params array and create a WHERE clause for the city
  if (options.city) {
    values.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${values.length}`;
  }

  if (options.owner_id) {
    values.push(options.owner_id);
    if (options.city) {
      queryString += `AND owner_id LIKE $${values.length}`;
    } else {
      queryString += `WHERE owner_id = $${values.length}`;
    }
  }

  if (options.minimum_price_per_night) {
    values.push(options.minimum_price_per_night * 100);
    if (options.city || options.owner_id) {
      queryString += `AND cost_per_night >= $${values.length}`;
    } else {
      queryString += `WHERE cost_per_night >= $${values.length}`;
    }
  }

  if (options.maximum_price_per_night) {
    values.push(options.maximum_price_per_night * 100);
    if (options.city || options.owner_id || options.minimum_price_per_night) {
      queryString += `AND cost_per_night <= $${values.length}`;
    } else {
      queryString += `WHERE cost_per_night <= $${values.length}`;
    }
  }

  queryString += `
  GROUP BY properties.id
  `;

  if (options.minimum_rating) {
    values.push(options.minimum_rating);
    queryString += `HAVING avg(property_reviews.rating) >= $${values.length} `;
  }

  //Add any query that comes after the WHERE clause
  values.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${values.length};
  `;

  console.log('query string: ', queryString, 'values: ', values);


  return pool
    .query(queryString, values)
    .then(res => {
      return res.rows;
    })
    .catch(e => {
      console.error('query error ', e.stack);
    });
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  let values = [property.title, property.description, property.owner_id,
  property.cover_photo_url, property.thumbnail_photo_url, property.cost_per_night,
  property.parking_spaces, property.number_of_bathrooms, property.number_of_bedrooms,
  property.province, property.city, property.country, property.street, property.post_code];

  let queryString = `
  INSERT INTO properties (
    title, description, owner_id, cover_photo_url, thumbnail_photo_url, cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms, province, city, country, street, post_code)
    VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;
  console.log('add query string: ', queryString, 'add values: ', values);

  return pool
    .query(queryString, values)
    .then(res => {
      console.log(res.rows)
      return res.rows[0];
    })
    .catch(e => {
      console.error('query error ', e.stack);
    });
}
exports.addProperty = addProperty;
