import "@videojs/react/video/skin.css";
import { createPlayer, videoFeatures } from "@videojs/react";
import { VideoSkin, Video } from "@videojs/react/video";

const Player = createPlayer({ features: videoFeatures });

/**
 * VideoPlayer — thin wrapper around @videojs/react.
 *
 * Props:
 *   src        {string}  Video URL (Cloudinary or blob)
 *   className  {string}  Extra classes on the outer wrapper div
 */
const VideoPlayer = ({ src, className = "" }) => {
  if (!src) return null;

  return (
    <div className={`w-full ${className} [&_*]:!rounded-none`}>
      <Player.Provider>
        <VideoSkin>
          <Video src={src} playsInline />
        </VideoSkin>
      </Player.Provider>
    </div>
  );
};

export default VideoPlayer;
