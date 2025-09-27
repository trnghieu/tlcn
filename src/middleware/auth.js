import jwt from "jsonwebtoken";

export const auth = (req,res,next)=>{
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if(!token) return res.status(401).json({ message:"Unauthorized" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message:"Invalid token" });
  }
};

// chỉ cho admin
export const adminOnly = (req,res,next)=>{
  if(req.user?.type !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};
