import db from "../db";

export const identifyContact = async (req: any, res: any) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phoneNumber is required" });
  }

  try {
    // Find all matching rows using email or phoneNumber
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

    const rows = result.rows;

    if (rows.length === 0) {
      console.log("Creating a new Primary contact");
      // No matching contacts found, create a new primary contact
      const insertResult = await db.query(
        `INSERT INTO Contact (email, phonenumber, linkprecedence, createdat, updatedat) 
         VALUES ($1, $2, 'primary', NOW(), NOW()) RETURNING id`,
        [email, phoneNumber]
      );

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
    let primaryContact = rows
      .filter((contact) => contact.linkprecedence === "primary")
      .sort(function (a, b) {
        return (
          new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf()
        );
      });
      console.log("Primary COntac rows ", primaryContact);
    

    // @ts-ignore
    const primaryContactId = primaryContact.id;
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
    let isNewContact;
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
    console.log("Is new contact:", isNewContact);
    if (isNewContact) {
      const insertResult = await db.query(
        `INSERT INTO Contact (email, phonenumber, linkedid, linkprecedence, createdat, updatedat) 
         VALUES ($1, $2, $3, 'secondary', NOW(), NOW()) RETURNING id`,
        [email, phoneNumber, primaryContactId]
      );
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
    console.error("Error identifying contact:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
