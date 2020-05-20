# VideoThumbnailLoader #########################################################


## Overview ####################################################################

The VideoThumbnailLoader is a tool that can help using a video track
(Representation) as a substitue of a manifest embedded thumbnail track.

The goal is to make a thumbnail out of HTML5 video element, by :
- Managing the loading / appending of resources from a given track
(video segments).
- Exploiting the Media Source Extension API to make it invisible to user.

The tool will need the loaded manifest video adaptation to contain trickmode
tracks. These kind of adaptation exists in MPEG-DASH and HLS, and contains
lightweight video tracks, most of the time including one unique frame for each
video segments. As video segments from trickmode tracks may be quicker to load
and easier to decode, they are preferred over standard video tracks for creating
thumbnails.

## How to use it ###############################################################


As an experimental tool, the VideoThumbnailLoader won't be included in a
default RxPlayer build.

Instead, it should be imported by adding the RxPlayer through a dependency
trough the npm registry (e.g. by doing something like ``npm install
rx-player``) and then specifically importing this tool from
``"rx-player/experimental/tools"``:

```js
import { VideoThumbnailLoader } from "rx-player/experimental/tools";
import RxPlayer from "rx-player";

const player = new RxPlayer({ /* some options */ });
player.loadVideo({ /* some other options */ });

// Video element used to display thumbnails.
const thumbnailVideoElement = document.createElement("video");
const videoThumbnailLoader = new VideoThumbnailLoader(
  thumbnailVideoElement,
  player
);

videoThumbnailLoader.setTime(200);
```

## Functions ###################################################################

### addFetcher #################################################################

_arguments_:
  - _fetcher_ (``Object``): Imported fetcher from VideoThumbnailLoader package.

To be able to load and parse segments from a specific streaming format, you may
import the corresponding fetcher from the VTL package, and add it to the
instance through this function.

#### Example

```js
  import {
    DASH_FETCHER, /* dash fetcher */
    SMOOTH_FETCHER, /* smooth fetcher */
    MPL_FETCHER, /* metaplaylist fetcher */
  } from "rx-player/experimental/tools/videoThumbnailLoader";
  videoThumbnailLoader.addFetcher(DASH_FETCHER);
  videoThumbnailLoader.addFetcher(SMOOTH_FETCHER);
  videoThumbnailLoader.addFetcher(MPL_FETCHER);
```

### setTime ####################################################################

_arguments_:

  - _time_ (``number``): Time for which we want to display a thumbnail.

_return value_: ``Promise``

From a given time, load video segments, and append to video element.
The loader find the period for the given time. In this period, it chooses
the first video adaptation. If a trick mode track is present on it, choose it.
Otherwise, select the first representation.

#### Return value

The return value is a Promise.
It :
- ``resolve`` when the thumbnail for given time has been loaded.
- ``reject`` in case of error : return an error.

The promise does not only rejects when setting thumbnail has failed. There are
some cases where the thumbnail loader decides not to load. Here is a list of
every failure code (``error.code``) :
- NO_MANIFEST : No manifest available on current RxPlayer instance.
- NO_TRACK : In the player manifest, there are either no period or no
             representation to get video chunks.
- MISSING_INIT_DATA : The chosen track does not have an init data, so it can't
                      be buffered.
- NO_THUMBNAIL : No segments are available for this time of the track.
- LOADING_ERROR : An error occured when loading a thumbnail into the video
                  element.
- ABORTED : The loading has been aborted (probably because of another loading
            started)

#### Example

```js
  videoThumbnailLoader.setTime(3000)
    .then(() => {
      console.log("Success :)");
    })
    .catch((err) => {
      console.log("Failure :(", err);
    })
```

### dispose ###################################################################

Dispose the tool resources. It has to be called when the tool is not used
anymore.

#### Example

```js
  onComponentUnmount() {
    videoThumbnailLoader.dispose();
  }
```

