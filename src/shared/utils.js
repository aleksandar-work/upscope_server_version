const { Datastore } = require( '@google-cloud/datastore' );

const empty = ( v ) => {
  let isEmpty = false;
  if ( !v || v == false || v === 'undefined' ) {
    isEmpty = true;
  }

  return isEmpty;
};

const getTolkien = async () => {
  const store = new Datastore();
  const query = store.createQuery( 'sec' ).limit( 1 );
  const [sec] = await store.runQuery( query );

    return sec[0]['tolkien'];

};

/**
 * 
 * Experimental Function
 */
const getMySecret = () => {
  return "KARAN";
}

//Validation for the auth;
const isEmpty = (value) => {
  if(value) return false;
  else return true;
}

module.exports = { empty, getTolkien, getMySecret, isEmpty };