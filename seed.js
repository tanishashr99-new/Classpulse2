const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase env vars.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const subjects = [
  "DSA", 
  "IML", 
  "OOPS", 
  "COA", 
  "Java", 
  "Python", 
  "Computer Networks", 
  "Operating Systems", 
  "DBMS", 
  "Software Engineering"
];

const names = [
  "Dr. Alan Turing",
  "Prof. Grace Hopper",
  "Dr. John von Neumann",
  "Prof. Ada Lovelace",
  "Dr. Donald Knuth",
  "Prof. Barbara Liskov",
  "Dr. Tim Berners-Lee",
  "Prof. Margaret Hamilton",
  "Dr. Edgar Codd",
  "Prof. Linus Torvalds"
];

async function seedTeachers() {
  console.log("Seeding teachers...");
  for (let i = 1; i <= 10; i++) {
    const email = `teacher${i}@giet.edu`;
    const password = `giet${100 + i}`; // 101 to 110
    
    // Create or Update the user in Supabase Auth
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    const existingUser = listData?.users?.find(u => u.email === email);

    if (existingUser) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          name: names[i - 1],
          subject: subjects[i - 1],
          role: "teacher"
        }
      });
      if (updateError) {
        console.log(`Error updating ${email}:`, updateError.message);
      } else {
        console.log(`Successfully updated ${email} to ${names[i - 1]}`);
      }
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: names[i - 1],
          subject: subjects[i - 1],
          role: "teacher"
        }
      });

      if (error) {
        console.log(`Error creating teacher${i} (${email}):`, error.message);
      } else {
        console.log(`Successfully created ${email} (${names[i-1]})`);
      }
    }

  }
}

seedTeachers();
