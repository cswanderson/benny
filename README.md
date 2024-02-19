benny
----------
- is a software playground for making live music or for making music live
- integrates hardware and software, midi and audio, lets you connect anything to anything, extends into polyphony elegantly
- aims for a low-density, low-distraction, glance-able interface that works for touch and mouse/keyboard use
- is agnostic about timelines and structure rather than imposing either
- is an extendible and hackable place to host your own max patches
- is not a DAW
  
installation
------------
- install max (cycling74.com) but no need to buy it or subscribe, see the 'important' note below
- in max / options / preferences / jitter preferences / make sure 'graphics engine' is set to glcore.
- open 'benny.maxproj'

IMPORTANT
---------
YOU DONT NEED TO BUY MAX TO USE THIS! just ignore all those messages, don't start the free trial, don't subscribe, nothing. you'll be able to use all the features of this software.
BUT if you decide you want to learn to build your own blocks you'll need to buy max.

configuration
-------------
- in the end, there'll be a hardware editor.. for now, using the hardware config .json files as an example, build your own, with entries for any pieces of modular or hardware you want to use. i recommend using an editor like vscode that has automatic syntax checking for json files.
- the vst plugin editor is rudimentary for now.. the idea is to pick a plugin, choose which parameters you want in the sidebar ui, assign them to up to 4 rows, press add..
    - KNOWN ISSUE if you only have 1 group a bug slightly corrupts the file. manually edit the .json files the vst editor spits out into the audio_blocks folder, look for the junk at the end of the 'groups' section and delete it.
    - KNOWN ISSUE you can't load a vst's config and edit it, you just have to do it again if you change your mind how you want the parameters organised
    - KNOWN ISSUE on windows max sometimes can't find your plugins. the simplest solution is put them all in C:\Program Files\VSTPlugins
- all the visual/ui preferences are in config.json. this gets overwritten when you update the software, so if you want to change a setting copy the relevant entry you want to change the value of over to userconfig.json.
   
temporary limits
----------------
at the moment the code is fixed to 64 midi block voices, 64 audio block voices, 24 hw outs, metronome click on 25, 12 hw ins. this will all be reconfigurable at startup in the end.
at the moment the individual audio plugin voices are restricted to being 2-in 2-out. eventually 'wide' voices with more io will be possible.

developing blocks
-----------------
tutorial still to come, but steal some bits out of my patchers and here's some notes. 
every patch needs:
- a .json file describing its inputs, outputs, parameters
- a .maxpat file (that does the processing - note or audio - for one voice of your block)
    - this needs to send a few messages out:
        - on load: 'getvoice' out of its first (main) outlet, then the system will reply with bits of information it needs to look up its parameters etc. you can't use the normal max method (thispoly) to determine which voice you are, because you may well be loaded in any number of wrapping subpatches.
        - block mute status (from a thispoly object) out the second outlet
        - any notes etc, preceded by the output number (eg 0 54 126) is a loud g# on the first output
    - it needs to respond to messages too:
        - notes: received as pairs, but the input number is note/128. eg 0-127 first input, 128-255 second etc
        - mute: pass this (1 or 0) direct to a thispoly
        - voice_is, voice_offset - for knowing where to look up parameters. for a gen example see voice.basic, for the simplest possible way of getting parameters steal the 'voice_header' subpatch that appears in eg midi.lfo. this looks up the .json file and spits out parameters for you, already scaled to the right ranges.
- (optional) a second .maxpat file that is for rendering a ui in the panels / sidebar / custom / fullscreen views. only really realistic to do this in javascript OR can also just be for global, per-block, processing, such as managing save data.
  - this also needs to send out a getvoice, and gets a number of function calls from the main system: setup (tells it the size of the rendering window etc), voice_is (tells it what block it's attached to), draw (draw a full ui), update (update ui efficiently), and store (prepare for save - data has to be copied from buffer memory into the blocks dict, and this is where that happens)
