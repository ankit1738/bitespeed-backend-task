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
        WHERE (email = $1 OR phoneNumber = $2)`,
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
    res.json(rows);
  } catch (error) {
    console.error("Error identifying contact:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
