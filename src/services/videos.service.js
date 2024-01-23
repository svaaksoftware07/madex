import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/videos.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {
  getUserObjectId,
  getCategoryObjectId,
  getMongoosePaginationOptions,
  formatDuration,
  isValidObjectId
} from "../utils/helperFunctions.js";
import { Channel } from "../models/channel.model.js";
import { Category } from "../models/categories.model.js";

//Created videos
const createVideos = async (
  videoDetails,
  videoFileLocalPath,
  thumbnailLocalPath
) => {
  const { title, description, views, channelId, categoryId } = videoDetails;

  if (!(channelId && categoryId)) {
    throw new ApiError(
      404,
      "channelId and categoryId are required and cannot be empty"
    );
  }
  const channels = await Channel.findById({ _id: channelId }).select("_id");
  console.log("channels", channels);

  if (!channels) {
    throw new ApiError(404, "channels does not exist");
  }

  const videoCategoryId = await getCategoryObjectId(categoryId);

  if (!videoFileLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "video file is required");
  }

  const video = await uploadOnCloudinary(videoFileLocalPath);
  const formattedDuration = formatDuration(video.duration); // Convert duration seconds into this format HH:MM:SS.

  const thumbnailImage = await uploadOnCloudinary(thumbnailLocalPath);

  if (!video || !thumbnailImage) {
    throw new ApiError(400, "video file and thumbnail are required");
  }
  console.log("chaneels", channels._id);
  const videoData = await Video.create({
    title,
    videoFile: video?.url || "",
    thumbnail: thumbnailImage?.url || "",
    description,
    duration: formattedDuration,
    views,
    channel: channels._id,
    videoCategory: videoCategoryId,
  });

  const dataToFetch = await Video.findById(videoData._id);

  if (!dataToFetch) {
    throw new ApiError(500, "Something went wrong while fetching the video");
  }
  return dataToFetch;
};

// Get all videos
const getAllVideos = async (queryData) => {

  const { page = 1, limit = 10 } = queryData;

  const videoAggregate = await Video.aggregate([
    {
      $lookup: {
        from: "channels",
        localField: "channel",
        foreignField: "_id",
        as: "channelData",
      },
    },
    {
      $unwind: "$channelData",
    },
    {
      $lookup: {
        from: "users",
        localField: "channelData.owner",
        foreignField: "_id",
        as: "ownerData",
      },
    },
    {
      $unwind: "$ownerData",
    },
    {
      $addFields: {
        "channelData.owner": {
          _id: "$ownerData._id",
          avatar: "$ownerData.avatar",
        },
      },
    },
    {
      $project: {
        _id: 1,
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        videoCategory: 1,
        createdAt: 1,
        channelData: {
          _id: 1,
          channelName: 1,
          owner: 1,
        },
      },
    },
    {
      $facet: {
        metadata: [{ $count: "totalVideos" }],
        videos: [
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ]
      }
    }
  ]);

  console.log("videoAggregate", videoAggregate);

  if (!videoAggregate || videoAggregate.length === 0) {
    throw new ApiError(404, "No video found");
  }

  return videoAggregate[0];
};

// Get single video by using its Id
const getSingleVideoById = async (paramsData) => {
  const { videoId } = paramsData;

  // Validate and create ObjectId instances for videoId
  const validIds = isValidObjectId([videoId]);

  if (!validIds[videoId]) {
    throw new ApiError(400, "Invalid ObjectId Format");
  }

  const singleVideoAggregate = await Video.aggregate([
    {
      $match: {
        _id: validIds[videoId],
      },
    },
    {
      $lookup: {
        from: "channels",
        localField: "channel",
        foreignField: "_id",
        as: "channelData",
      },
    },
    {
      $unwind: "$channelData",
    },
    {
      $lookup: {
        from: "users",
        localField: "channelData.owner",
        foreignField: "_id",
        as: "ownerData",
      },
    },
    {
      $unwind: "$ownerData",
    },
    {
      $addFields: {
        "channelData.owner": {
          _id: "$ownerData._id",
          avatar: "$ownerData.avatar",
        },
      },
    },
    {
      $project: {
        _id: 1,
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        videoCategory: 1,
        createdAt: 1,
        channelData: {
          _id: 1,
          channelName: 1,
          owner: 1,
        },
      },
    },
  ]);

  if (!singleVideoAggregate || singleVideoAggregate.length === 0) {
    throw new ApiError(404, "Video not found");
  }

  const singleVideo = singleVideoAggregate[0];

  return singleVideo;
};

//  Get all the video by using of channelId
const getAllVideoByChannelId = async( paramsData ) => {

  const { channelId } = paramsData;
  console.log("channelId", channelId);
  
 //Validate and create ObjectId instances for channelId 
 const validIds = isValidObjectId([channelId]);

 if(!validIds[channelId]) {
  throw new ApiError(400, "Invalid ObjectId Format")
 }

  // Check existing channel 
  const existingChannel = await Channel.findById(validIds[channelId]);

  if(!existingChannel) {
    throw new ApiError(404, "Channel does not exist");
  }

  // Find all the videos on the basis of the channel
  const videos = await Video.find({ channel: validIds[channelId] });
  
  if(videos && videos.length === 0) {
    throw new ApiError(404, "No Video Found");                                                                                                                                                      
  }

  return videos;
}

//  Get all the video by using of categoreyId
const getAllVideoByCategoryId = async( paramsData ) => {

  const { categoryId } = paramsData;
  console.log("categoryId", categoryId);
  
 //Validate and create ObjectId instances for categoreyId 
 const validIds = isValidObjectId([categoryId]);

 if(!validIds[categoryId]) {
  throw new ApiError(400, "Invalid ObjectId Format")
 }

  // Check existing category 
  const existingCategory = await Category.findById(validIds[categoryId]);

  if(!existingCategory) {
    throw new ApiError(404, "Categorey does not exist");
  }

  // Find all the videos on the basis of the categorey
  const videos = await Video.find({ videoCategory: validIds[categoryId] });
 
  
  if(videos && videos.length === 0) {
    throw new ApiError(404, "No Video Found");                                                                                                                                                      
  }

  return videos;
}

export default {
  createVideos,
  getAllVideos,
  getSingleVideoById,
  getAllVideoByChannelId,
  getAllVideoByCategoryId
};
