import db from '../db';
import { Contact } from '../types';

export const findContacts = async (email:string, phoneNumber:string) => {
    let result;
    if(email && phoneNumber){
        result = await db.query(
          `SELECT * FROM Contact
          WHERE (email = $1 OR phoneNumber = $2 
          OR linkedid = (SELECT linkedid FROM Contact where (email = $1 OR phoneNumber = $2) AND linkedid IS NOT NULL LIMIT 1 )
          OR id = (SELECT linkedid FROM Contact where (email = $1 OR phoneNumber = $2) AND linkedid IS NOT NULL LIMIT 1 )
          ) AND deletedAt IS NULL`,
          [email, phoneNumber]
        );
      }
      else if(!phoneNumber){
        result = await db.query(
          `SELECT * FROM Contact WHERE email = $1 OR phonenumber in (SELECT phonenumber from Contact where email = $1) AND deletedat IS NULL;`,
          [email]
        );
      }else{
        result = await db.query(
          `SELECT * FROM Contact WHERE phonenumber = $1 OR email in (SELECT email from Contact where phonenumber = $1) AND deletedat IS NULL;`,
          [phoneNumber]
        );
      }
  
      return result.rows;
}

export const insertContact = async (contact: Contact) => {
    return await db.query(
        `INSERT INTO Contact (email, phonenumber, linkedid, linkprecedence, createdat, updatedat) 
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        [contact.email, contact.phoneNumber, contact.linkedid, contact.linkprecedence]
      );

    //   await db.query(
    //     `INSERT INTO Contact (email, phonenumber, linkedid, linkprecedence, createdat, updatedat) 
    //      VALUES ($1, $2, $3, 'secondary', NOW(), NOW()) RETURNING id`,
    //     [email, phoneNumber, primaryContactId]
    //   );
}

export const getContact = async (contact: Contact) => {
    return  await db.query(
        `SELECT * FROM Contact WHERE id = $1 AND deletedAt IS NULL`,
        [contact.linkedid]
      );
}

export const updateContact = async (id:string) => {
    const updateQuery = `Update Contact set linkprecedence = 'secondary' where id = ${id}`;
    await db.query(updateQuery);
    console.log("Update query", updateQuery);
}

export const isNewContact = (rows:any[], email:string, phoneNumber:string) => {
    let isNewContact
    if (!email || !phoneNumber) {
        isNewContact = !rows.some(
          (contact) =>
            contact.email === email || contact.phonenumber === phoneNumber
        );
      } else {
        isNewContact = !rows.some(
          (contact) =>
            contact.email === email && contact.phonenumber === phoneNumber
        );
      }

      return isNewContact;
}