import express from "express"
import bodyParser from "body-parser"
import pg from "pg"
import env from "dotenv";
import bcrypt from "bcrypt";

const app=express();
const saltRounds = 10;
const port=3000;
env.config();
var task,length,email,password
var priority=new Array()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  db.connect();

  app.get("/",(req,res)=>{
    res.render("home.ejs")
  })
  app.get("/login", (req, res) => {
    res.render("login.ejs");
  });
  app.get("/register", (req, res) => {
    res.render("register.ejs");
  });

  app.post("/register", async(req,res)=> {
    email = req.body.email;
    password = req.body.password;
  
    try {
      const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
  
      if (checkResult.rows.length > 0) {
        res.render("login.ejs",{msg:"Email aldready exists. Try logging in"});
      } else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if (err) {
            console.error("Error hashing password:", err);
          } else {
            console.log("Hashed Password:", hash);
            await db.query("INSERT INTO users (email,password,task,priority) VALUES ($1, $2,$3,$4)",
          [email, hash,"{}","{}"]);
          res.redirect("/login")
        }
        });
         }
    } catch (err) {
      console.log(err);
    }
  });
  
  app.post("/login", async (req, res) => {
    email = req.body.email;
    password = req.body.password;
    try {
      const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);
      console.log(result)
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password,storedHashedPassword,(err,result)=>{
          if(err){
            console.log("Error comparing passwords");
          }
          else{
            if(result){
              res.redirect("/list") 
            }
            else {
              res.render("login.ejs",{msg:"Incorrect Password. Try again"});
            }
          }
        })   
      } else {
        res.render("login.ejs",{msg:"User not found"});
      }
    } catch (err) {
      console.log(err);
    }
  });

  app.get("/modify/:id",(req,res)=>{
    var id=req.params.id;
    res.render("modify.ejs",{task:task[id],priority:priority[id],id:id})
  })
  
  app.post("/update/:id",async(req,res)=>{
    var id=req.params.id
    task[id]=req.body.task
    priority[id]=req.body.priority
    await db.query("UPDATE users SET task = $1,priority=$2 WHERE email=$3;",[task,priority, email]);
    res.redirect("/list")
  })

  app.get("/new",(req,res)=>{
    res.render("add.ejs")
  })

  app.post("/new",async(req,res)=>{
    await db.query("UPDATE users SET task = ARRAY_APPEND(task, $1),priority=ARRAY_APPEND(priority,$2) WHERE email=$3;",[req.body.task,0, email]); 
    res.redirect("/list")
  })

  app.get("/list",async(req,res)=>{
    task=await db.query("SELECT task FROM users WHERE email=$1",[email]);
    priority=await db.query("SELECT priority FROM users WHERE email=$1",[email]);
    length=task.rows[0].task.length
    priority=priority.rows[0].priority
    task=task.rows[0].task
    for (var j = 0; j < length; j++) 
    {
      for (var k = 0; k < length - 1 - j; k++) 
      { 
          if (Number(priority[k]) < Number(priority[k + 1])) 
          { 
              var tempPriority = priority[k];
              priority[k] = priority[k + 1];
              priority[k + 1] = tempPriority;
              var tempTask = task[k];
              task[k] = task[k + 1];
              task[k + 1] = tempTask;
          }
      }
  }
    await db.query("UPDATE users SET priority= $1,task=$2 WHERE email=$3",[priority,task,email])
    res.render("list.ejs",{priority:priority,task:task,email:email,length:length})
  })

  app.get("/incpriority/:id",async(req,res)=>{
    priority[req.params.id]=Number(priority[req.params.id])+1;
    await db.query("UPDATE users SET priority= $1 WHERE email=$2",[priority,email])
    res.redirect("/list")
  })

  app.get("/decpriority/:id",async(req,res)=>{
    priority[req.params.id]=priority[req.params.id]-1;
    await db.query("UPDATE users SET priority= $1 WHERE email=$2",[priority,email])
    res.redirect("/list")
  })

var i;
  app.get("/delete/:id",async(req,res)=>{
    i=req.params.id
    task.splice(i, 1);
    priority.splice(i, 1);
    await db.query("UPDATE users SET priority= $1,task=$2 WHERE email=$3",[priority,task,email])
    res.redirect("/list")
  })


  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
