var MAX_DATA = 1024;
var MAX_NOTE_VOICES = 64;
var MAX_PARAMETERS = 256;
var MAX_WAVES = 16;
var MAX_WAVES_SLICES = 1024;
var voice_data_buffer = new Buffer("voice_data_buffer"); 
var voice_parameter_buffer = new Buffer("voice_parameter_buffer");
outlets = 3;
var config = new Dict;
config.name = "config";
var width, height,x_pos,y_pos,unit,sx,rh,cw,maxl,showcols;
var block=-1;
var display_row_offset = 0;
var display_col_offset = 0;
var currentwave=0;
var currentslice=0;
var currentvel=100;
var cursorx=0;
var cursorx2=0;
var cursory=0;
var s=[];
var l=[];
var baseoct=4;
var mini;
var namelist;
var note_names = new Array(128);
var map = new Dict;
map.name = "voicemap";
var blocks = new Dict;
blocks.name = "blocks";
var waves_dict = new Dict;
waves_dict.name = "waves";
var v_list = [];
var keymap = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 28, -1, 14, 16, -1, 19, 21, 23, -1, 26, -1, -1, -1, 31, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 30, -1, 32, -1, -1, -1, -1, 8, 5, 4, 17, -1, 7, 9, 25, 11, -1, -1, 12, 10, 27, 29, 13, 18, 2, 20, 24, 6, 15, 3, 22, 1, -1, -1, -1, -1, -1];
var fx_names = ["Arpeggio", "B", "Cut", "Delay", "E", "Fade", "retriGger", "Hold", "I", "Jump", "K", "L", "harMonic", "N", "Offset", "Pitchslide UP", "Qitchslide down", "Ramp", "Sometimes", "porTamento", "hUrry", "reVerse", "daWdle", "X", "Y", "Z"];
var fx_descs = ["chiptune style arpeggio, the values are [note1][note2][rate] or [note1][rate]",
".",
"stops the sample playback partway through the row","actions the row slightly late",
".",
"fades the volume down linearly (see also: Ramp)",
"does a roll, [rate][volume incdec] or [rate][volume incdec][pitch incdec] incdec values 5 = static, 0 = decreases fast 9 = increases fast",
"holds playback at a point using the timestretch",
".",
"to random octave. [-ve range][+ve range] or [+ve range]",
".",".",
"multiplies the playback rate by this integer. numbers >100 are treated as negative",
".",
"starts playback after the slice marker by this offset",
"slides pitch up (see also Qitchslide down)",
"slides pitch down",
"ramps the volume up linearly (see also: Fade)",
"not probability based - uses a counter instead, you set the increment amount and when it wraps (at 128) the note plays. increment amount = 128 means play every time, = 1 means play every 128 times. the counter is per-column of the tracker.",
".",
"use timestretch to play the sample faster",
"1 = reverse playback, 0=forward",
"use timestretch to play the sample slower (see also hurry)",
".",".","."];
var cursors = new Array(128); //holds last drawn position of playheads (per row)
//data format: for each voice the buffer holds:
// 0 - start (*128)
// 1 - length (*128+1)
// 2 - playhead position (updated by player voice)
// 3-131? data values
function setup(x1,y1,x2,y2,sw){ //has screen width too so it can plot a little fx/waveform hint window bottom right
//	post("drawing sequencers");
	menucolour = config.get("palette::menu");
	width = x2-x1;
	height = y2-y1;
	x_pos = x1;
	y_pos = y1;
	showcols=Math.floor(2*width/height);
	if(width<500){ 
		post("width",width);
		mini=1;
	}else{
		mini=0;
	}
	unit = height / 18;
	display_row_offset = 0;
	display_col_offset = 0;
	cursorx=0;
	cursorx2=0;
	cursory=0;
	baseoct=4;
	currentwave=0;
	currentslice=0;
	currentvel=100;
	namelist = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
	for(i=0;i<128;i++){
		note_names[i] = namelist[i%12]+(Math.floor(i/12)-2);
	}
	draw();
}
function draw(){
	if(block>=0){
		outlet(1,"paintrect",x_pos,y_pos,width+x_pos,height+y_pos,0,0,0);
		//post("\n\nmini",mini);
		var c,r,i,ph,rr,rc;
		v_list = map.get(block);
		if(typeof v_list=="number") v_list = [v_list];
		for(i=0;i<v_list.length;i++) {
			cursors[i]=-1;
		}
		if(mini) showcols = v_list.length;
		i= showcols; 
		rh = 0.5*unit;
		sy = 1.2*unit;
		sx = 1.2*unit;
		cw = (width - sx)/i;
		maxl = Math.floor((height-sy)/rh);
		if(!mini){
			outlet(1,"paintrect",x_pos+sx,y_pos,x_pos+width,sy+y_pos,menucolour[0]*0.1,menucolour[1]*0.1,menucolour[2]*0.1);
			outlet(1,"font","Consolas",rh*0.8);
			outlet(1,"frgb",menucolour);
			outlet(1,"moveto",3+sx+x_pos,rh*0.75+y_pos);
			outlet(1,"write","octave");
			outlet(1,"moveto",3+sx+x_pos,rh*1.45+y_pos);
			outlet(1,"write",baseoct-2);
			outlet(1,"moveto",3+sx+0.2*cw+x_pos,rh*0.75+y_pos);
			outlet(1,"write","vel");
			outlet(1,"moveto",3+sx+0.2*cw+x_pos,rh*1.45+y_pos);
			outlet(1,"write",currentvel);
			outlet(1,"moveto",3+sx+0.4*cw+x_pos,rh*0.75+y_pos);
			outlet(1,"write","wave");
			outlet(1,"moveto",3+sx+0.4*cw+x_pos,rh*1.45+y_pos);
			outlet(1,"write",(1+currentwave));
			outlet(1,"moveto",3+sx+0.55*cw+x_pos,rh*0.75+y_pos);
			outlet(1,"write","slice");
			outlet(1,"moveto",3+sx+0.55*cw+x_pos,rh*1.45+y_pos);
			outlet(1,"write",currentslice+1);
			if(cursorx2<4) draw_wave_hint(currentwave,currentslice);
			for(c=display_col_offset;c<Math.min(display_col_offset+showcols,v_list.length);c++){
				ph = Math.floor(voice_data_buffer.peek(1, MAX_DATA*v_list[c]));
				l[c]  = Math.floor(voice_parameter_buffer.peek(1, MAX_PARAMETERS*v_list[c]+2)*127.999)+1;
				s[c]  = Math.floor(voice_parameter_buffer.peek(1, MAX_PARAMETERS*v_list[c]+1)*127.999);
				outlet(1,"moveto", 3+sx+cw*(c-display_col_offset)+x_pos, rh*2.15+y_pos);
				outlet(1,"write", "voice", c+1);
				cursors[c]=ph;
				for(r=0;r<maxl;r++){			
					drawcell((c-display_col_offset),r);
				}
			}
		}
		for(r=0;r<maxl;r++){			
			rr = r+display_row_offset;
			rc = ((rr%2)==0)+((rr%4)==0)+((rr%8)==0)+((rr%16)==0);
			rc = (4+rc)/24;
			
			outlet(1,"paintrect",x_pos,sy+rh*r+y_pos,sx-9+x_pos,sy+rh*(r+1)+y_pos,menucolour[0]*rc,menucolour[1]*rc,menucolour[2]*rc);
			outlet(1,"moveto",3+x_pos,sy+rh*(r+0.75)+y_pos);
			if(!mini){
				outlet(1,"frgb",menucolour);
				outlet(1,"write",rr);
			}
		}
		outlet(0,"custom_ui_element","mouse_passthrough",x_pos,sy+y_pos,width+x_pos,height+y_pos,0,0,0,block,0);
	//	outlet(0,"bang");
		outlet(1,"bang");
	}
}


function update(){
	var c,o;
	for(c=display_col_offset;c<v_list.length;c++){
		ph = Math.floor(voice_data_buffer.peek(1, MAX_DATA*v_list[c]));
		if(cursors[c]!=ph){
			//l[c]  = Math.floor(voice_parameter_buffer.peek(1, MAX_PARAMETERS*v_list[c]+2)*128)+1;
			//s[c]  = Math.floor(voice_parameter_buffer.peek(1, MAX_PARAMETERS*v_list[c]+1)*128);
			o = cursors[c]-display_row_offset;
			cursors[c]=ph;
			//redraw cell that was old cursor
			if((o>=0)&&(o<maxl)){
				drawcell(c-display_col_offset,o);	
			}
			
			//draw new cursor cell
			o=cursors[c]-display_row_offset;
			if((o>=0)&&(o<maxl)){
				drawcell(c-display_col_offset,o);
			}
		}
	}
}


function drawcell(c,r){
	if((c>=0)&&(c<showcols)){
		var rr,rc,fc,i,ll,ss;
		var values;
		rr = r+display_row_offset;
		rc = ((rr%2)==0)+((rr%4)==0)+((rr%8)==0)+((rr%16)==0);
		rc = rc/24;
		fc = [menucolour[0]*0.25,menucolour[1]*0.25,menucolour[2]*0.25];
		if((rr>=s[c+display_col_offset])&&(rr<s[c+display_col_offset]+l[c+display_col_offset])){
			rc+=0.1;
			fc=menucolour;
		}
		if(cursors[c+display_col_offset]==rr){
			rc=(rc+0.3)*1.5;
			fc=[0,0,0];
		}
		outlet(1,"paintrect",sx+c*cw+x_pos,sy+rh*r+y_pos,sx+(c+0.95)*cw+x_pos,sy+rh*(r+1)+y_pos,menucolour[0]*rc,menucolour[1]*rc,menucolour[2]*rc);
		outlet(1,"frgb",fc);
		values = voice_data_buffer.peek(1,MAX_DATA*v_list[(c+display_col_offset)]+1+6*rr,6);
	//	post(values,"\n");
		var incell = ((cursorx==(c+display_col_offset))&&(cursory==rr));
		var x=0;
		var washighlight=0;
		for(i=0;i<6;i++){		
			//outlet(1,"write","... ... .. ... . ..");
			if(!mini){
				if(i==2){
					ll=2;
					ss="..";
				}else if(i==4){
					ll=1;
					ss=".";
				}else if(i==5){
					ll=3;
					ss="...";
				}else{
					ll=3;
					ss="...";
				}
				if(values[i]!=0){
					if(i==0){
						if(values[i]==-1){
							ss="off";
						}else{
							ss = note_names[values[i]-1];
						}
					}else if(i==4){
						ss = String.fromCharCode(63+values[i]);
					}else{
						ss = (values[i]-1);
						if(i==2) ss++;
						//if(i==3) ss++;
					}
				}
			}
			if(incell && (i==cursorx2)){
				outlet(1,"paintrect",sx+(c+(x-1)/20)*cw+x_pos,sy+rh*r+y_pos,sx+(c+(x+ll+1)/20)*cw+x_pos,sy+rh*(r+1)+y_pos,0,0,0);
				outlet(1,"frgb",255,255,255);
				if(!mini){
					washighlight=1;
					if((cursorx2>=4)&&(values[4]>1)){
						if(values[4]>1) draw_fx_hint(values[4]-2);
					}else if((cursorx2<4)){
						if(values[2]>0) draw_wave_hint(values[2]-1,values[3]-1);
					}
				}
			}else if(washighlight){
				washighlight=0;
				outlet(1,"frgb",fc);
			}
			if(!mini){
				if(i>0) ss = ("....." + ss).slice(-ll); 
				outlet(1,"moveto",sx+(c+x/20)*cw+3+x_pos,sy+rh*(r+0.75)+y_pos);
				outlet(1,"write",ss);
			}
			x+=ll+1;
		}
	}
}

function draw_fx_hint(fx){
	outlet(1,"moveto",3+sx+0.75*cw+x_pos,rh*0.75+y_pos);
	outlet(1,"textface","bold");
	outlet(1,"write",fx_names[fx]);
	var x=3+sx+1.1*cw+x_pos;
	var str=fx_descs[fx].split(" ");
	var ws = "";
	var y=rh*0.75+y_pos;
	var xx = x;
	for(var i=0;i<str.length;i++){
		ws = ws + " " + str[i];
		xx += str[i].length * unit * 0.27;
		if((xx>(x_pos+width))||(i==str.length-1)){
			//post("\n\n\nxx is ",xx,"x+w is",x_pos+width);
			outlet(1,"moveto",x,y);
			outlet(1,"write",ws);
			ws="";
			xx=x;
			y+=rh*0.7;
		}
	}
}

function draw_wave_hint(wave,slice){
	if(waves_dict.contains("waves["+(1+wave)+"]::name")){
		wnam = waves_dict.get("waves["+(1+wave)+"]::name");
		outlet(0, "custom_ui_element","waveform_slice_highlight",3+sx+0.75*cw+x_pos, y_pos, -9+width+x_pos, sy+y_pos,menucolour[0]*1.1,menucolour[1]*1.1,menucolour[2]*1.1,block,wave+1,slice/MAX_WAVES_SLICES); 
		outlet(1,"moveto",3+sx+0.75*cw+x_pos,rh*0.75+y_pos);
		var wnam;
		var wns = wnam.split(".");
		wns.length -= 1;
		var wn = wns[0];
		for(i=1;i<wns.length;i++){
			wn=wn+"."+wns[i];
		}
		outlet(1,"write",wn);
	} 
}

function mouse(x,y,lb,sh,al,ct,scr){
	var ox = cursorx;
	var oy = cursory;
	if(scr!=0){
		if(sh==0){
			if(scr<0){
				cursory=(cursory+1) & 127;
			}else{
				cursory=(cursory+127) & 127;
			}
		}else{
			if(scr<0){
				cursorx2++;
				if(cursorx2>5){
					cursorx2=0;
					cursorx=(cursorx+1)%v_list.length;
				}
			}else{
				cursorx2--;
				if(cursorx2<0){
					cursorx2=5;
					cursorx=(cursorx+v_list.length-1)%v_list.length;
				}
			}			
		}
	}else{
		//todo shift select, copy paste?
		cursorx = (x-sx-x_pos)/cw;
		cursorx += display_col_offset;
		cursorx2 = Math.floor((cursorx % 1)*6);
		cursorx = Math.min(v_list.length-1,Math.floor(cursorx));	
		cursory = Math.floor((y-sy-y_pos)/rh);
		cursory += display_row_offset;
	}
	var df=0;
	if(lb==0){
		if(cursory-display_row_offset>30){
			display_row_offset=cursory-30;
			df=1;
		}else if(cursory-display_row_offset<5){
			display_row_offset=Math.max(0,cursory-5);
			df=1;
		}
		if(cursorx-display_col_offset<1){
			display_col_offset=Math.max(0,cursorx-1);
			df=1;
		}else if(cursorx-display_col_offset>1){
			display_col_offset=cursorx-1;
			df=1;
		}
	}
	if(df){
		draw();
		if(cursorx!=ox)	messnamed("to_blockmanager","select_voice",cursorx,0);
	}else{
		if((cursorx!=ox)||(cursory!=oy)){
			drawcell(ox-display_col_offset,oy-display_row_offset);
		}
		if(cursorx!=ox)	messnamed("to_blockmanager","select_voice",cursorx,0);
		drawcell(cursorx-display_col_offset,cursory-display_row_offset);		
	}
}
function keydown(key){
	var ox = cursorx;
	var oy = cursory;
	switch(key){
		case -15:
			cursorx=0;
			cursorx2=0;
			cursory=0;
			messnamed("to_blockmanager","select_voice",cursorx,0);
			break;
		case -9:
			cursory=(cursory+127) & 127;
			break;
		case -10:
		case -4:
			cursory=(cursory+1) & 127;
			break;
		case -11:
			cursorx2--;
			if(cursorx2<0){
				cursorx2=5;
				cursorx=(cursorx+v_list.length-1)%v_list.length;
				messnamed("to_blockmanager","select_voice",cursorx,0);
			}
			break;
		case -12:
			cursorx2++;
			if(cursorx2>5){
				cursorx2=0;
				cursorx=(cursorx+1)%v_list.length;
				messnamed("to_blockmanager","select_voice",cursorx,0);
			}
			break;
		case 108:
			baseoct++;
			if(baseoct>10)baseoct=10;
			draw();
			break;
		case 44:
			baseoct--;
			if(baseoct<0)baseoct=0;
			break;
		case 59:
			currentwave++;
			if(currentwave>128)currentwave=128;
			voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory+2,currentwave+1);
			draw();
			break;
		case 46:
			currentwave--;
			if(currentwave<0)currentwave=0;
			voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory+2,currentwave+1);
			draw();
			break;
		case 39:
			currentslice++;
			if(currentslice>MAX_WAVES_SLICES)currentslice=MAX_WAVES_SLICES;
			voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory+3,currentslice+1);
			draw();
			break;
		case 47:
			currentslice--;
			if(currentslice<0)currentslice=0;
			voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory+3,currentslice+1);
			draw();
			break;	
		case 61:
			currentvel++;
			if(currentvel>128)currentvel=128;
			voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory+1,currentvel+1);
			draw();
			break;
		case 45:
			currentvel--;
			if(currentvel<0)currentvel=0;
			voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory+1,currentvel+1);
			draw();
			break;
		case -6:
			//optionally del could move everything up one?
			for(i=cursory;i<127;i++){
				var rowvalues = voice_data_buffer.peek(1, MAX_DATA*v_list[cursorx]+1+6*(i+1),6);
				voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*i,rowvalues);
			}
			draw();
			break;
		case -8:
			//insert
			for(i=128;i>cursory;i--){
				var rowvalues = voice_data_buffer.peek(1, MAX_DATA*v_list[cursorx]+1+6*(i-1),6);
				voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*i,rowvalues);
			}
			var rowvalues=[0,0,0,0,0,0];
			voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory,rowvalues);
			draw();
			break;
		case -7:
			if(cursorx2==0){
				var rowvalues=[0,0,0,0,0,0];
				voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory,rowvalues);
			}else{
				voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory+cursorx2,0);
			}
			draw();
			break;
		default:
			if(cursorx2==0){
				if(key==49){
					var rowvalues=[-1,0,0,0];
					post("off");
					voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory,rowvalues);
				}else if(key>0){
					if(keymap[key]>-1){
						var rowvalues = [baseoct*12+keymap[key],currentvel+1,currentwave+1,currentslice+1];
						var t=voice_data_buffer.peek(1,MAX_DATA*v_list[cursorx]+1+6*cursory+1);
						if(t>0) rowvalues[1]=t;
						t=voice_data_buffer.peek(1,MAX_DATA*v_list[cursorx]+1+6*cursory+2);
						if(t>0) rowvalues[2]=t;
						t=voice_data_buffer.peek(1,MAX_DATA*v_list[cursorx]+1+6*cursory+3);
						if(t>0) rowvalues[3]=t;
						voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory,rowvalues);
						cursory=(cursory+1) & 127;
					}
				}
			}else if((cursorx2==1)||(cursorx2==3)){
				var t=key-48;
				if((t>=0)&&(t<10)){
					var o=voice_data_buffer.peek(1, MAX_DATA*v_list[cursorx]+1+6*cursory+cursorx2)-1;
					if((o>0)&&(o<100)){
						o*=10;
						o+=t;
					}else{
						o=t;
					}
					if(cursorx2==1) currentvel = o |0;
					if(cursorx2==3) currentslice = (o-1) |0;
					voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory+cursorx2,o+1);
				}
			}else if((cursorx2==2)||(cursorx2==5)){
				var t=key-48;
				if((t>=0)&&(t<10)){
					var o=voice_data_buffer.peek(1, MAX_DATA*v_list[cursorx]+1+6*cursory+cursorx2)-1;
					if((o>0)&&(o<10)){
						o*=10;
						o+=t;
					}else{
						o=t;
					}
					if(cursorx2==2) currentwave = --o |0;
					voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory+cursorx2,o+1);
				}
			}else if((cursorx2==4)){
				var t=key-96;
				post("fx",t);
				if((t>=0)&&(t<=26)){					
					voice_data_buffer.poke(1, MAX_DATA*v_list[cursorx]+1+6*cursory+cursorx2,t+1);
				}
			}
			
			break;
	}
	var df=0;
	if(cursory-display_row_offset>30){
		display_row_offset=cursory-30;
		df=1;
	}else if(cursory-display_row_offset<5){
		display_row_offset=Math.max(0,cursory-5);
		df=1;
	}
	if(cursorx-display_col_offset<=showcols){
		display_col_offset=Math.max(0,cursorx-1);
		df=1;
	}else if(cursorx-display_col_offset>=showcols-1){
		display_col_offset=cursorx-1;
		df=1;
	}
	if(df){
		draw();
	}else{
		if((cursorx!=ox)||(cursory!=oy)){
			drawcell(ox-display_col_offset,oy-display_row_offset);
		}
		drawcell(cursorx-display_col_offset,cursory-display_row_offset);		
	}
}

function voice_is(v){
	block = v;
	v_list = map.get(block);
	if(typeof v_list=="number") v_list = [v_list];

	outlet(0,"request_waves_remapping","ui",v);
//	post("seq.grid.ui loaded, block is",block);
}
function voice_offset(){}
function loadbang(){
	outlet(0,"getvoice");
}

function quer(){
	post("vlist is",v_list);
}
function store(){
	var r;
	var transf_arr = new Array(MAX_DATA);
	for(r=0;r<v_list.length;r++){
		transf_arr = voice_data_buffer.peek(1, MAX_DATA*v_list[r], MAX_DATA);
		blocks.replace("blocks["+block+"]::voice_data::"+r, transf_arr);
	}
}
function remapping(froom,too){
	post("\nremapping_list "+froom +" -> "+too+" .. ");
	var cx,cy,cv,ct=0;
	for(cx=0;cx<v_list.length;cx++){
		for(cy=0;cy<128;cy++){
			cv = voice_data_buffer.peek(1, MAX_DATA*v_list[cx]+1+6*cy+2);
			if(cv==froom+1){
				voice_data_buffer.poke(1, MAX_DATA*v_list[cx]+1+6*cy+2,-(too+1));
				ct++;
			}
		}
	}
	post("remapped "+ct+" notes");
}
function finalise_remapping(){
	var cx,cy,cv;
	for(cx=0;cx<v_list.length;cx++){
		for(cy=0;cy<128;cy++){
			cv = voice_data_buffer.peek(1, MAX_DATA*v_list[cx]+1+6*cy+2);
			if(cv<0){
				voice_data_buffer.poke(1, MAX_DATA*v_list[cx]+1+6*cy+2,-cv);
			}
		}
	}
}