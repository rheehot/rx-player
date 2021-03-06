# Custom SourceBuffers #########################################################


## Overview ####################################################################

Technically speaking ``SourceBuffer``s are browser objects allowing JavaScript
applications to "append" media segments for them to be decoded at the right time
through their attached media element (e.g. ``<audio>`` or ``<video>`` media
elements).

The browser usually already defines audio and video `SourceBuffers`. This
directory allows us to implement more "Custom" `SourceBuffers` such as `text`
for subtitles.

The implementation of those Custom `SourceBuffers` is done to be the closest
possible to the ones implemented by the browser.

Let's say for example that we want to implement a custom SourceBuffer for text
contents. This custom SourceBuffer will have to:
  - update its buffered information
  - call the corresponding text parser
  - display the right subtitle at the right timecode
