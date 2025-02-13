import { findContacts, getContact, insertContact, isNewContact, updateContact } from "../service/identifyService";

export const identifyContact = async (req: any, res: any) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phoneNumber is required" });
  }

  try {
    // Find all matching rows using email or phoneNumber
    const rows = await findContacts(email, phoneNumber);
    
    if (rows.length === 0) {
      // No matching contacts found, create a new primary contact
      const insertResult = await insertContact({email, phoneNumber, linkedid:null, linkprecedence:'primary'});

      const newContactId = insertResult.rows[0].id;

      return res.status(200).json({
        contact: {
          primaryContactId: newContactId,
          emails: [email].filter(Boolean),
          phoneNumbers: [phoneNumber].filter(Boolean),
          secondaryContactIds: [],
        },
      });
    }

    //Process linked contacts

    let flag = true; // flag is used to identify if a secondary contact was updated or not so that a new entry is not created

    //sort primary contact by createdat
      let primaryContact = rows
      .filter((contact) => contact.linkprecedence === "primary")
      .sort(function (a, b) {
        return (
          new Date(a.createdat).valueOf() - new Date(b.createdat).valueOf()
        );
      });

    if (primaryContact.length === 0) {
      //no primary contact found, the found contact with email or phonenumber is secondary and now we need to find 
      //the linked primary contact.
      const result = await getContact({linkedid: rows[0].linkedid});
      primaryContact = result.rows[0];
    } else if (primaryContact.length === 1) {
      primaryContact = primaryContact[0];
    } else {
      //multiple Primary contacts found
      //only the oldest contact will remain as primary
      flag = false;
      await updateContact(primaryContact[1].id);
    }

    // @ts-ignore
    const primaryContactId = primaryContact.id; // chosing the older one as primary id
    const emails = new Set(
      rows.map((contact) => contact.email).filter(Boolean)
    );
    const phoneNumbers = new Set(
      rows.map((contact) => contact.phonenumber).filter(Boolean)
    );
    const secondaryContactIds = rows
      .filter((contact) => contact.id !== primaryContactId)
      .map((contact) => contact.id);

    //Check if secondary contact needs to be created
    let _isNewContact = isNewContact(rows, email, phoneNumber);
    
    if (_isNewContact && flag) {

      const insertResult = await insertContact({email, phoneNumber, linkprecedence:'secondary', linkedid:primaryContactId});
      
      secondaryContactIds.push(insertResult.rows[0].id);
      emails.add(email);
      phoneNumbers.add(phoneNumber);
    }

    res.status(200).json({
      contact: {
        primaryContactId: primaryContactId,
        emails: Array.from(emails),
        phoneNumbers: Array.from(phoneNumbers),
        secondaryContactIds: secondaryContactIds,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
