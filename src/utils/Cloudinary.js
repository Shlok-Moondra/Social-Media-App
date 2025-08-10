import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import { log } from 'console';

    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 
    });
    
    
const uploadOnCloudinary = async (filePath) => {
    try {
        if(!filePath) return null;
        // upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(filePath,{
            resource_type:"auto"
        })
        console.log("Cloudinary response:", response.url);
        return response;
         
    }catch(error){
        fs.unlinkSync(filePath); // delete the file from local storage

    }
}


export { uploadOnCloudinary };
     