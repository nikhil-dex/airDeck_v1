import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import Ppts from "@/models/Ppts";


export async function POST(req){
    try{
        await dbConnect();
        const {title,code,user} = await req.json();
        const findUser = await User.findOne({_id: user});
        if(!findUser){
            return Response.json({error: "User not found"}, {status: 404});
        }
        const newPpt = await Ppts.create({
            userid: user,
            titles: title,
            ppt_History: [code],
        });
        
        findUser.ppt_History.push(newPpt._id);
        await findUser.save();
        
        return Response.json({message: "PPT saved successfully"}, {status: 200});
        


    }catch(error){
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
    }
}

// userid: {
//     type: String,
//     required: true,
//   },
//   titles:{
//     type: Array,
//     default: [],
//   }
//   , 
//   ppt_History: {
//     type: Array,
//     default: [],
//   }, 
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }