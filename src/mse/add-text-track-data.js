/**
 * @file add-text-track-data.js
 */
import window from 'global/window';
import videojs from 'video.js';
/**
 * Define properties on a cue for backwards compatability,
 * but warn the user that the way that they are using it
 * is depricated and will be removed at a later date.
 *
 * @param {Cue} cue the cue to add the properties on
 * @private
 */
const deprecateOldCue = function(cue) {
  Object.defineProperties(cue.frame, {
    id: {
      get() {
        videojs.log.warn(
          'cue.frame.id is deprecated. Use cue.value.key instead.'
        );
        return cue.value.key;
      }
    },
    value: {
      get() {
        videojs.log.warn(
          'cue.frame.value is deprecated. Use cue.value.data instead.'
        );
        return cue.value.data;
      }
    },
    privateData: {
      get() {
        videojs.log.warn(
          'cue.frame.privateData is deprecated. Use cue.value.data instead.'
        );
        return cue.value.data;
      }
    }
  });
};

export const durationOfVideo = function(duration) {
  let dur;

  if (isNaN(duration) || Math.abs(duration) === Infinity) {
    dur = Number.MAX_VALUE;
  } else {
    dur = duration;
  }
  return dur;
};
/**
 * Add text track data to a source handler given the captions and
 * metadata from the buffer.
 *
 * @param {Object}
 *   @param {Object} inbandTextTracks the inband text tracks
 *   @param {Number} timestampOffset the timestamp offset of the source buffer
 *   @param {Number} videoDuration the duration of the video
 *   @param {Array} captionArray an array of caption data
 *   @param {Array} metadataArray an array of meta data
 * @private
 */
export const addTextTrackData = ({
  inbandTextTracks,
  timestampOffset,
  videoDuration,
  captionArray,
  metadataArray
}) => {
  let Cue = window.WebKitDataCue || window.VTTCue;

  if (captionArray) {
    captionArray.forEach((caption) => {
      let track = caption.stream;

      inbandTextTracks[track].addCue(
        new Cue(
          caption.startTime + timestampOffset,
          caption.endTime + timestampOffset,
          caption.text
        ));
    });
  }

  if (metadataArray) {
    metadataArray.forEach((metadata) => {
      let time = metadata.cueTime + timestampOffset;

      metadata.frames.forEach((frame) => {
        let cue = new Cue(
          time,
          time,
          frame.value || frame.url || frame.data || '');

        cue.frame = frame;
        cue.value = frame;
        deprecateOldCue(cue);

        inbandTextTracks.metadataTrack_.addCue(cue);
      });
    });

    // Updating the metadeta cues so that
    // the endTime of each cue is the startTime of the next cue
    // the endTime of last cue is the duration of the video
    if (inbandTextTracks.metadataTrack_ &&
        inbandTextTracks.metadataTrack_.cues &&
        inbandTextTracks.metadataTrack_.cues.length) {
      let cues = inbandTextTracks.metadataTrack_.cues;
      let cuesArray = [];

      // Create a copy of the TextTrackCueList...
      // ...disregarding cues with a falsey value
      for (let i = 0; i < cues.length; i++) {
        if (cues[i]) {
          cuesArray.push(cues[i]);
        }
      }

      // Group cues by their startTime value
      let cuesGroupedByStartTime = cuesArray.reduce((obj, cue) => {
        let timeSlot = obj[cue.startTime] || [];

        timeSlot.push(cue);
        obj[cue.startTime] = timeSlot;

        return obj;
      }, {});

      // Sort startTimes by ascending order
      let sortedStartTimes = Object.keys(cuesGroupedByStartTime)
                                   .sort((a, b) => Number(a) - Number(b));

      // Map each cue group's endTime to the next group's startTime
      sortedStartTimes.forEach((startTime, idx) => {
        let cueGroup = cuesGroupedByStartTime[startTime];
        let nextTime = Number(sortedStartTimes[idx + 1]) || videoDuration;

        // Map each cue's endTime the next group's startTime
        cueGroup.forEach((cue) => {
          cue.endTime = nextTime;
        });
      });
    }
  }
};
