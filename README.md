# Spreza
This is a MEAN web application which interfaces any speech recognition engine to provide an end-to-end transcription platform.

Allows multiple users to upload or link audio files to be transcribed, and an interface to play audio and edit the transcript.

Requires a speech recognition service to function.

## Requirements

### Local:

Node.js 6+

NPM 3+

FFMPEG

MongoDB client (server can be remote hosted)


### Additional (Cloud / Local replacement):

(AWS SQS / RabbitMQ or Celery) for job queue
(AWS SES / MailDev) for mailing

Currently configured to use my fork of the kaldi-gstreamer-server

https://github.com/skoocda/kaldi-gstreamer-server

Which is a single master + queue manager, multi-worker architecture.


## CI

This project uses Gulp for building, packaging, and optionally for deployment.

A server/config.js file is required to specify local parameters
