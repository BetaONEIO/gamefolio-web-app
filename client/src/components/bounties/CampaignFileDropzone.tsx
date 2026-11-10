import {useEffect,useId,useRef,useState} from 'react';
import {Upload,FileCheck, X} from 'lucide-react';
import { bountyVideoDimensionError } from '@shared/bounty-video-dimensions';

type VideoDimensions = { width: number; height: number };
const videoDimensionsByFile = new WeakMap<File, Promise<VideoDimensions | null>>();

export async function campaignVideoFileError(file: File, type: string): Promise<string | null> {
  if (type !== 'clip' && type !== 'reel') return null;

  let dimensions = videoDimensionsByFile.get(file);
  if (!dimensions) {
    dimensions = new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      const done = (value: VideoDimensions | null) => {
        window.clearTimeout(timeout);
        video.onloadedmetadata = null;
        video.onerror = null;
        video.removeAttribute('src');
        URL.revokeObjectURL(url);
        resolve(value);
      };
      const timeout = window.setTimeout(() => done(null), 7000);
      video.preload = 'metadata';
      video.onloadedmetadata = () => done({ width: video.videoWidth, height: video.videoHeight });
      video.onerror = () => done(null);
      video.src = url;
    });
    videoDimensionsByFile.set(file, dimensions);
  }
  const size = await dimensions;
  // Some playable upload formats cannot be decoded by every browser.
  // The campaign upload API checks those files before accepting them.
  return size ? bountyVideoDimensionError(type, size.width, size.height) : null;
}

export function campaignFileError(file:Pick<File,'name'|'type'|'size'>,type:string,maxMb?:number):string|null {
  const image=type==='screenshot';
  const types=image?['image/jpeg','image/png','image/webp']:['video/mp4','video/webm','video/quicktime'];
  const extension=image?/\.(jpe?g|png|webp)$/i:/\.(mp4|webm|mov)$/i;
  if(!['clip','reel','screenshot'].includes(type))return 'This content type does not accept file uploads.';
  if(file.type?!types.includes(file.type):!extension.test(file.name))return image?'Choose a JPG, PNG or WebP image.':'Choose an MP4, WebM or MOV video.';
  if(file.size<=0)return 'This file is empty. Choose another file.';
  if(maxMb!=null&&file.size>maxMb*1024*1024)return `Choose a file smaller than ${maxMb}MB.`;
  return null;
}
export default function CampaignFileDropzone({type,file,onFile,disabled=false,maxMb,hint}:{type:string;file?:File|null;onFile:(file:File|null)=>void;disabled?:boolean;maxMb?:number;hint?:string}) {
  const id=useId(),input=useRef<HTMLInputElement>(null),depth=useRef(0);
  const [dragging,setDragging]=useState(false),[error,setError]=useState('');
  const [checking, setChecking] = useState(false);
  const selection = useRef(0);
  useEffect(() => {
    setChecking(false);
    return () => { selection.current++; };
  }, [disabled, type]);
  const label=type==='screenshot'?'screenshot':type==='reel'?'reel':'clip';
  async function choose(files: FileList | null) {
    if (disabled || !files?.length) return;
    const currentSelection = ++selection.current;
    const nextFile = files[0];
    const message = files.length !== 1 ? `Add one ${label} at a time.` : campaignFileError(nextFile, type, maxMb);
    setError(message ?? '');
    if (message) {
      setChecking(false);
      return;
    }
    setChecking(type !== 'screenshot');
    const dimensionError = await campaignVideoFileError(nextFile, type);
    if (currentSelection !== selection.current) return;
    setChecking(false);
    setError(dimensionError ?? '');
    if (!dimensionError) onFile(nextFile);
  }
  return <div className="campaign-drop-field"><input ref={input} id={id} type="file" disabled={disabled} className="sr-only" accept={type==='screenshot'?'image/jpeg,image/png,image/webp':'video/mp4,video/webm,video/quicktime'} aria-label={`Choose ${label} file`} aria-describedby={`${id}-hint`} onChange={event=>{choose(event.target.files);event.target.value='';}}/>
    <button type="button" className={`campaign-drop-zone ${dragging?'is-dragging':''}`} disabled={disabled} aria-label={`Choose or drop a ${label}`} onClick={()=>input.current?.click()} onDragEnter={event=>{event.preventDefault();event.stopPropagation();if(!disabled){depth.current++;setDragging(true);}}} onDragOver={event=>{event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect=disabled?'none':'copy';}} onDragLeave={event=>{event.preventDefault();event.stopPropagation();depth.current=Math.max(0,depth.current-1);if(!depth.current)setDragging(false);}} onDrop={event=>{event.preventDefault();event.stopPropagation();depth.current=0;setDragging(false);choose(event.dataTransfer.files);}}>
      {file?<FileCheck size={25}/>:<Upload size={25}/>}<strong>{file?file.name:`Drag and drop your ${label} here`}</strong><span>{file?'Click to choose another file':'or click to choose a file'}</span><small>{type==='screenshot'?'JPG, PNG or WebP':type==='reel'?'Vertical video · MP4, MOV or WebM':'Horizontal video · MP4, MOV or WebM'}{maxMb?` · Max ${maxMb}MB`:''}</small>
    </button>
    {file&&<button type="button" className="campaign-drop-remove" disabled={disabled} onClick={()=>{selection.current++;setChecking(false);onFile(null);setError('');}}><X size={15}/>Remove selected file</button>}
    <p id={`${id}-hint`} className="campaign-drop-hint">{hint}</p>{checking && !disabled && <p role="status" className="campaign-drop-hint">Checking video dimensions…</p>}{error&&<p role="alert" className="campaign-drop-error">{error}</p>}
  </div>;
}
