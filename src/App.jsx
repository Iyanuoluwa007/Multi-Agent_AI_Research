import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
   AI RESEARCH SCIENTIST — Multi-Agent Research Pipeline
   
   Modes:
     DEMO  — instant demo data, no API key needed
     LIVE  — real arXiv search + Claude or OpenAI API agents
   
   Providers:
     Claude  (Anthropic)  — claude-sonnet-4-20250514
     OpenAI  (GPT)        — gpt-4o
   ═══════════════════════════════════════════════════════════════════ */

// ── Constants ────────────────────────────────────────────────────
const AGENTS = [
  { key:"search",     num:"01", label:"Paper Search",      role:"Queries arXiv for relevant papers", color:"#4ade80" },
  { key:"summarize",  num:"02", label:"Summarization",     role:"AI extracts contributions, methods, results",     color:"#38bdf8" },
  { key:"hypothesize",num:"03", label:"Hypothesis Gen",    role:"AI synthesizes gaps into testable hypotheses",     color:"#c084fc" },
  { key:"plan",       num:"04", label:"Experiment Design",  role:"AI creates protocols with datasets and metrics",  color:"#fbbf24" },
  { key:"code",       num:"05", label:"Code Generator",    role:"AI produces production PyTorch implementation",    color:"#f472b6" },
  { key:"evaluate",   num:"06", label:"Evaluator",         role:"AI reviews all outputs and scores the pipeline",   color:"#34d399" },
];
const TABS = ["overview","papers","hypotheses","experiment","code","report","toolkit"];

// ── arXiv Search (free, no key) ─────────────────────────────────
async function searchArxiv(query, max = 8) {
  try {
    const p = new URLSearchParams({ search_query:`all:${query}`, start:"0", max_results:String(max), sortBy:"relevance", sortOrder:"descending" });
    const r = await fetch(`https://export.arxiv.org/api/query?${p}`);
    const xml = await r.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    return Array.from(doc.querySelectorAll("entry")).map(e => ({
      title: e.querySelector("title")?.textContent?.trim().replace(/\n/g," ") || "Untitled",
      authors: Array.from(e.querySelectorAll("author name")).map(n=>n.textContent).slice(0,5),
      abstract: e.querySelector("summary")?.textContent?.trim().replace(/\n/g," ").slice(0,800) || "",
      url: e.querySelector("id")?.textContent?.trim() || "",
      published: e.querySelector("published")?.textContent?.slice(0,10) || "",
      categories: Array.from(e.querySelectorAll("category")).map(c=>c.getAttribute("term")).slice(0,5),
    }));
  } catch (e) { console.error("arXiv:", e); return null; }
}

// ── LLM API Callers ─────────────────────────────────────────────
async function callClaude(key, sys, msg, maxTok = 4096) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-api-key":key, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:maxTok, system:sys, messages:[{role:"user",content:msg}] }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0,150)}`);
  const d = await r.json();
  return d.content?.[0]?.text || "";
}

async function callOpenAI(key, sys, msg, maxTok = 4096) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${key}` },
    body: JSON.stringify({ model:"gpt-4o", max_tokens:maxTok, messages:[{role:"system",content:sys},{role:"user",content:msg}] }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0,150)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

async function callLLM(provider, key, sys, msg, maxTok = 4096) {
  return provider === "openai" ? callOpenAI(key, sys, msg, maxTok) : callClaude(key, sys, msg, maxTok);
}

function parseJSON(t) {
  let c = t.trim().replace(/^```(?:json)?\s*/,"").replace(/\s*```$/,"").trim();
  return JSON.parse(c);
}

// ── Agent Prompts ───────────────────────────────────────────────
const P = {
  sum:`You are a senior AI research scientist. Given papers and a query, return ONLY a JSON array:
[{"paper_title":"...","key_contributions":["..."],"methodology":"...","results":"...","limitations":"...","relevance_score":0.85}]`,
  hyp:`You are a creative AI researcher. Return ONLY a JSON array of 3 hypotheses:
[{"title":"...","description":"...","rationale":"...","novelty_score":0.8,"feasibility_score":0.7,"expected_impact":"..."}]`,
  plan:`You are a meticulous experiment designer. Return ONLY valid JSON:
{"title":"...","objective":"...","methodology":"...","datasets":["..."],"metrics":["..."],"baseline_comparison":"...","steps":["Step 1: ..."],"estimated_compute":"..."}`,
  code:`You are an expert PyTorch ML engineer. Return ONLY valid JSON:
{"filename":"experiment.py","description":"...","code":"full python code","dependencies":["torch"]}
Code: complete, runnable, 80-200 lines, imports, model, training, evaluation.`,
  eval:`You are a senior research reviewer. Return ONLY valid JSON:
{"hypothesis_validated":true,"key_findings":["..."],"metrics_summary":{"m":"v"},"strengths":["..."],"weaknesses":["..."],"next_steps":["..."],"overall_score":0.75}`,
};

// ── Demo Data ───────────────────────────────────────────────────
const D = {
  papers:[
    {title:"YOLOv9: Learning What You Want to Learn Using Programmable Gradient Information",authors:["C.-Y. Wang","I.-H. Yeh","H.-Y.M. Liao"],abstract:"We introduce PGI and GELAN to address information bottleneck, achieving SOTA real-time detection on MS COCO.",url:"https://arxiv.org/abs/2402.13616",published:"2024-02-15",categories:["cs.CV"]},
    {title:"RT-DETR: DETRs Beat YOLOs on Real-time Object Detection",authors:["Y. Zhao","W. Lv","S. Xu"],abstract:"First real-time DETR-based detector: 53.1% AP at 114 FPS on T4 TensorRT.",url:"https://arxiv.org/abs/2304.08069",published:"2023-04-17",categories:["cs.CV"]},
    {title:"Gold-YOLO: Efficient Object Detector via Gather-and-Distribute Mechanism",authors:["C. Wang","W. He","Y. Nie"],abstract:"Novel GD mechanism for multi-scale fusion. Gold-YOLO-N: 39.9% AP at 1030 FPS.",url:"https://arxiv.org/abs/2309.11331",published:"2023-09-20",categories:["cs.CV"]},
    {title:"DAMO-YOLO: A Report on Real-Time Object Detection Design",authors:["X. Xu","Y. Jiang","W. Chen"],abstract:"DAMO-YOLO extends YOLO with NAS and AlignedOTA. 42.0% AP at 190 FPS.",url:"https://arxiv.org/abs/2211.15444",published:"2022-11-28",categories:["cs.CV"]},
    {title:"EfficientDet: Scalable and Efficient Object Detection",authors:["M. Tan","R. Pang","Q.V. Le"],abstract:"BiFPN for weighted bi-directional feature fusion with compound scaling.",url:"https://arxiv.org/abs/1911.09070",published:"2019-11-20",categories:["cs.CV"]},
  ],
  summaries:[
    {paper_title:"YOLOv9: Learning What You Want to Learn Using Programmable Gradient Information",key_contributions:["PGI framework","GELAN architecture","SOTA on COCO"],methodology:"PGI via auxiliary reversible branch; GELAN gradient path planning",results:"55.6% AP on COCO",limitations:"Training complexity",relevance_score:.95},
    {paper_title:"RT-DETR: DETRs Beat YOLOs on Real-time Object Detection",key_contributions:["First real-time DETR","Hybrid encoder AIFI+CCFM","NMS-free"],methodology:"Hybrid encoder + uncertainty-minimal query selection",results:"53.1% AP at 114 FPS",limitations:"Needs TensorRT",relevance_score:.91},
    {paper_title:"Gold-YOLO: Efficient Object Detector via Gather-and-Distribute Mechanism",key_contributions:["GD mechanism","Dual compute branches"],methodology:"GD replaces FPN/PAN with conv + self-attention",results:"39.9% AP at 1030 FPS",limitations:"Single-stage only",relevance_score:.88},
  ],
  hypotheses:[
    {title:"Adaptive Gradient Routing for Dynamic Feature Fusion",description:"Combine PGI gradient control with Gold-YOLO GD for input-adaptive fusion reducing computation on simple scenes while maintaining accuracy on complex ones.",rationale:"PGI improves training; GD improves fusion. Combining achieves both with adaptive compute.",novelty_score:.85,feasibility_score:.72,expected_impact:"15-25% speed improvement on easy images"},
    {title:"Distillation-Aware NMS-Free Detection Head",description:"RT-DETR-inspired query selection head for YOLO, eliminating NMS via learned refinement.",rationale:"RT-DETR proves NMS-free is viable at real-time speeds.",novelty_score:.78,feasibility_score:.80,expected_impact:"10-20% latency reduction"},
    {title:"Resolution-Adaptive Inference with Early Exit",description:"Multi-resolution pipeline with low-res pass and selective high-res processing.",rationale:"Fixed resolution wastes compute on sparse scenes.",novelty_score:.82,feasibility_score:.65,expected_impact:"30-50% FLOPs reduction"},
  ],
  plan:{title:"Adaptive Gradient Routing with Dynamic Feature Fusion for YOLO",objective:"Validate input-adaptive fusion reduces latency 15-25% while maintaining mAP within 0.5%",methodology:"Adaptive router predicts scene complexity, routes features through light or full fusion paths. Train on COCO with detection + routing loss.",datasets:["MS COCO 2017","Pascal VOC 2012","Objects365 subset"],metrics:["mAP@0.5","mAP@0.5:0.95","FPS (T4)","GFLOPs","Latency p50/p99"],baseline_comparison:"YOLOv8-N/S/M, Gold-YOLO-N/S, RT-DETR-R18/R34",steps:["Implement YOLO backbone","Design SceneComplexityRouter","Build LightGD + FullGD paths","Create AdaptiveNeck","Joint detection+routing loss","Train COCO 300 epochs","Evaluate by scene complexity","Threshold ablation","TensorRT FP16 profiling"],estimated_compute:"~48 GPU-hours A100"},
  code:{filename:"adaptive_yolo_experiment.py",description:"Adaptive Gradient Routing YOLO",dependencies:["torch>=2.0","torchvision","pycocotools","tqdm"],code:`"""Adaptive Gradient Routing YOLO"""\nimport torch, torch.nn as nn, torch.nn.functional as F, time\n\nclass SceneComplexityRouter(nn.Module):\n    def __init__(self, ch=256):\n        super().__init__()\n        self.pool = nn.AdaptiveAvgPool2d(1)\n        self.fc = nn.Sequential(nn.Linear(ch,64),nn.ReLU(True),nn.Linear(64,1),nn.Sigmoid())\n    def forward(self, x): return self.fc(self.pool(x).flatten(1))\n\nclass LightGD(nn.Module):\n    def __init__(self, ch=256):\n        super().__init__()\n        self.g=nn.Conv2d(ch,ch//2,1); self.d=nn.Conv2d(ch//2,ch,1); self.bn=nn.BatchNorm2d(ch)\n    def forward(self, x): return self.bn(self.d(F.gelu(self.g(x)))+x)\n\nclass FullGD(nn.Module):\n    def __init__(self, ch=256, heads=4):\n        super().__init__()\n        self.dw=nn.Conv2d(ch,ch,3,padding=1,groups=ch)\n        self.attn=nn.MultiheadAttention(ch,heads,batch_first=True)\n        self.ffn=nn.Sequential(nn.Conv2d(ch,ch,1),nn.BatchNorm2d(ch),nn.GELU(),nn.Conv2d(ch,ch,1))\n        self.norm=nn.LayerNorm(ch)\n    def forward(self, x):\n        B,C,H,W=x.shape; t=self.norm(self.dw(x).flatten(2).permute(0,2,1))\n        a,_=self.attn(t,t,t); return self.ffn(a.permute(0,2,1).view(B,C,H,W))+x\n\nclass AdaptiveNeck(nn.Module):\n    def __init__(self, ch=256, thr=0.5):\n        super().__init__()\n        self.router=SceneComplexityRouter(ch); self.light=LightGD(ch); self.full=FullGD(ch); self.thr=thr\n    def forward(self, x):\n        c=self.router(x)\n        if self.training:\n            w=c.unsqueeze(-1).unsqueeze(-1); return self.light(x)*(1-w)+self.full(x)*w, c\n        mask=(c>self.thr).squeeze(-1); out=torch.zeros_like(x)\n        if (~mask).any(): out[~mask]=self.light(x[~mask])\n        if mask.any(): out[mask]=self.full(x[mask])\n        return out, c\n\nclass AdaptiveYOLO(nn.Module):\n    def __init__(self, nc=80):\n        super().__init__()\n        self.backbone=nn.Sequential(nn.Conv2d(3,64,6,2,2),nn.BatchNorm2d(64),nn.SiLU(True),nn.Conv2d(64,128,3,2,1),nn.BatchNorm2d(128),nn.SiLU(True),nn.Conv2d(128,256,3,2,1),nn.BatchNorm2d(256),nn.SiLU(True))\n        self.neck=AdaptiveNeck(256)\n        self.head=nn.Sequential(nn.Conv2d(256,256,3,padding=1),nn.BatchNorm2d(256),nn.SiLU(True),nn.Conv2d(256,3*(5+nc),1))\n    def forward(self, x): fused,c=self.neck(self.backbone(x)); return self.head(fused),c\n\nif __name__=="__main__":\n    m=AdaptiveYOLO(80); m.eval(); x=torch.randn(1,3,640,640)\n    print(f"Params: {sum(p.numel() for p in m.parameters()):,}")\n    for _ in range(10): m(x)\n    t=[]\n    for _ in range(50):\n        t0=time.perf_counter()\n        with torch.no_grad(): m(x)\n        t.append((time.perf_counter()-t0)*1000)\n    print(f"Latency: {sum(t)/len(t):.1f}ms  FPS: {1000/(sum(t)/len(t)):.0f}")`},
  eval:{hypothesis_validated:true,key_findings:["Adaptive routing differentiates scene complexity","Light path: ~22% latency reduction","Full fusion maintains accuracy on complex scenes","Soft routing enables end-to-end gradients","Hard inference routing gives clean savings"],metrics_summary:{"mAP@0.5":"~48.2%","mAP@0.5:0.95":"~32.4%","FPS (simple)":"~185 T4","FPS (complex)":"~142 T4","Params":"3.2M","GFLOPs (light)":"~4.1","GFLOPs (full)":"~8.7"},strengths:["Novel PGI+GD combination","Input-dependent compute","Clean soft/hard routing","Production code","Strong theory"],weaknesses:["Simplified backbone","Global pooling limits","Full COCO training pending","Threshold unexplored"],next_steps:["Train full COCO 300 epochs","Replace backbone CSPDarknet53","Multi-scale routing P3/P4/P5","TensorRT FP16 profiling","Threshold ablation","Benchmark BDD100K/VisDrone"],overall_score:.78},
};

// ── Toolkit Scripts ─────────────────────────────────────────────
const TK = [
  {id:"train",title:"Training Script",file:"train.py",icon:"TR",color:"#4ade80",desc:"Full COCO training: cosine LR, EMA, routing loss, checkpointing.",
   code:"#!/usr/bin/env python3\n\"\"\"train.py - Adaptive YOLO Training\nUsage: python train.py --data-dir ./data/coco --epochs 300\n\"\"\"\nimport argparse, os, math, json, copy, torch, torch.nn as nn, torch.optim as optim\nfrom pathlib import Path\nfrom adaptive_yolo_experiment import AdaptiveYOLO\n\ndef get_args():\n    p = argparse.ArgumentParser()\n    p.add_argument('--data-dir', default='./data/coco')\n    p.add_argument('--epochs', type=int, default=300)\n    p.add_argument('--batch', type=int, default=16)\n    p.add_argument('--lr', type=float, default=0.01)\n    p.add_argument('--img-size', type=int, default=640)\n    p.add_argument('--save-dir', default='./runs/train')\n    p.add_argument('--resume', default='')\n    p.add_argument('--routing-lambda', type=float, default=0.1)\n    return p.parse_args()\n\nclass ModelEMA:\n    def __init__(self, model, decay=0.9999):\n        self.ema = copy.deepcopy(model).eval()\n        for p in self.ema.parameters(): p.requires_grad_(False)\n        self.decay = decay\n    def update(self, model):\n        with torch.no_grad():\n            for ep,mp in zip(self.ema.parameters(),model.parameters()):\n                ep.data.mul_(self.decay).add_(mp.data, alpha=1-self.decay)\n\ndef train():\n    args = get_args()\n    sd = Path(args.save_dir); sd.mkdir(parents=True, exist_ok=True)\n    dev = torch.device('cuda' if torch.cuda.is_available() else 'cpu')\n    model = AdaptiveYOLO(80).to(dev)\n    ema = ModelEMA(model)\n    opt = optim.SGD(model.parameters(), lr=args.lr, momentum=0.937, weight_decay=5e-4, nesterov=True)\n    # TODO: Replace with real COCO DataLoader\n    best = float('inf'); hist = []\n    for epoch in range(args.epochs):\n        model.train()\n        lr = 1e-5 + .5*(args.lr-1e-5)*(1+math.cos(math.pi*epoch/args.epochs))\n        for pg in opt.param_groups: pg['lr'] = lr\n        el = 0.0\n        for _ in range(100):  # Replace: for imgs, targets in loader\n            x = torch.randn(args.batch,3,args.img_size,args.img_size,device=dev)\n            det, comp = model(x)\n            ld = nn.functional.mse_loss(det, torch.zeros_like(det))\n            feat = model.backbone(x)\n            tgt = feat.var(dim=[2,3]).mean(1,keepdim=True); tgt = tgt/(tgt.max()+1e-6)\n            lr_loss = nn.functional.mse_loss(comp, tgt)\n            loss = ld + args.routing_lambda * lr_loss\n            opt.zero_grad(); loss.backward()\n            nn.utils.clip_grad_norm_(model.parameters(), 10.0)\n            opt.step(); ema.update(model); el += loss.item()\n        avg = el/100; hist.append({'epoch':epoch,'loss':avg,'lr':lr})\n        print(f'Epoch {epoch+1}/{args.epochs} Loss={avg:.4f} LR={lr:.6f}')\n        if avg < best:\n            best = avg\n            torch.save({'epoch':epoch,'model':model.state_dict(),'ema':ema.ema.state_dict()}, sd/'best.pt')\n    torch.save({'model':ema.ema.state_dict()}, sd/'final.pt')\n    json.dump(hist, open(sd/'history.json','w'), indent=2)\n    print(f'Done. Best={best:.4f}')\n\nif __name__=='__main__': train()"},
  {id:"datasets",title:"Dataset Downloader",file:"download_datasets.sh",icon:"DS",color:"#38bdf8",desc:"Downloads COCO, VOC, VisDrone with extraction and verification.",
   code:"#!/bin/bash\nset -euo pipefail\nD=\"./data\"; mkdir -p \"$D\"\necho '=== Dataset Downloader ==='\n\n# COCO 2017\nif [ ! -d \"$D/coco/images/train2017\" ]; then\n  mkdir -p \"$D/coco\"/{images,annotations}\n  echo 'Downloading COCO train2017 (18GB)...'\n  wget -q --show-progress -O \"$D/coco/t.zip\" http://images.cocodataset.org/zips/train2017.zip\n  unzip -q \"$D/coco/t.zip\" -d \"$D/coco/images/\" && rm \"$D/coco/t.zip\"\n  echo 'Downloading COCO val2017 (1GB)...'\n  wget -q --show-progress -O \"$D/coco/v.zip\" http://images.cocodataset.org/zips/val2017.zip\n  unzip -q \"$D/coco/v.zip\" -d \"$D/coco/images/\" && rm \"$D/coco/v.zip\"\n  echo 'Downloading annotations...'\n  wget -q --show-progress -O \"$D/coco/a.zip\" http://images.cocodataset.org/annotations/annotations_trainval2017.zip\n  unzip -q \"$D/coco/a.zip\" -d \"$D/coco/\" && rm \"$D/coco/a.zip\"\nfi\necho '[OK] COCO'\n\n# VOC\nif [ ! -d \"$D/voc/VOCdevkit\" ]; then\n  mkdir -p \"$D/voc\"\n  wget -q --show-progress -O \"$D/voc/v.tar\" http://host.robots.ox.ac.uk/pascal/VOC/voc2012/VOCtrainval_11-May-2012.tar\n  tar -xf \"$D/voc/v.tar\" -C \"$D/voc/\" && rm \"$D/voc/v.tar\"\nfi\necho '[OK] VOC'\n\n# BDD100K (manual)\necho '[INFO] BDD100K: register at https://bdd-data.berkeley.edu/'\nmkdir -p \"$D/bdd100k\"\n\necho 'Done'\ndu -sh \"$D\"/*/ 2>/dev/null"},
  {id:"config",title:"Experiment Config",file:"config.yaml",icon:"CF",color:"#c084fc",desc:"Full config: architecture, training, augmentation, ablation.",
   code:"# config.yaml\nexperiment: { name: adaptive-yolo, seed: 42 }\nmodel:\n  num_classes: 80\n  backbone: cspdarknet53\n  neck: { type: adaptive, channels: 256, threshold: 0.5, routing_lambda: 0.1 }\ntraining:\n  epochs: 300\n  batch_size: 16\n  optimizer: { type: sgd, lr: 0.01, momentum: 0.937, weight_decay: 0.0005 }\n  scheduler: { type: cosine, warmup: 5, lr_min: 0.00001 }\n  ema: { enabled: true, decay: 0.9999 }\n  mixed_precision: true\naugmentation:\n  mosaic: { prob: 0.5, disable_after: 280 }\n  mixup: { prob: 0.15 }\n  flip_lr: 0.5\ndata:\n  train: ./data/coco/images/train2017\n  val: ./data/coco/images/val2017\n  img_size: 640\n  workers: 8\nevaluation:\n  metrics: [mAP@0.5, mAP@0.5:0.95, FPS, GFLOPs]\n  eval_interval: 10\nablation:\n  thresholds: [0.3, 0.4, 0.5, 0.6, 0.7]"},
  {id:"eval",title:"Evaluation Script",file:"evaluate.py",icon:"EV",color:"#fbbf24",desc:"Latency profiling, routing analysis, threshold ablation.",
   code:"#!/usr/bin/env python3\n\"\"\"evaluate.py - Eval & Ablation\"\"\"\nimport argparse, json, time, os, torch, numpy as np\nfrom pathlib import Path\nfrom adaptive_yolo_experiment import AdaptiveYOLO\n\ndef profile(model, batch=1, dev='cuda', runs=200):\n    x = torch.randn(batch,3,640,640,device=dev); model.eval()\n    for _ in range(50):\n        with torch.no_grad(): model(x)\n    ts=[]\n    for _ in range(runs):\n        t0=time.perf_counter()\n        with torch.no_grad(): model(x)\n        ts.append((time.perf_counter()-t0)*1000)\n    ts=np.array(ts)\n    return dict(avg=round(float(ts.mean()),2),p50=round(float(np.percentile(ts,50)),2),fps=round(1000/float(ts.mean()),1))\n\ndef main():\n    p = argparse.ArgumentParser()\n    p.add_argument('--checkpoint', required=True)\n    p.add_argument('--output', default='./results')\n    args = p.parse_args()\n    out=Path(args.output); out.mkdir(parents=True, exist_ok=True)\n    dev=torch.device('cuda' if torch.cuda.is_available() else 'cpu')\n    m=AdaptiveYOLO(80).to(dev)\n    if os.path.exists(args.checkpoint):\n        ck=torch.load(args.checkpoint,map_location=dev)\n        m.load_state_dict(ck.get('model',ck.get('ema',ck)),strict=False)\n    res={}\n    for b in [1,8,32]: res[f'batch{b}']=profile(m,b,str(dev))\n    for thr in [.3,.4,.5,.6,.7]:\n        m.neck.thr=thr; res[f'thr_{thr}']=profile(m,1,str(dev),100)\n    json.dump(res, open(out/'results.json','w'), indent=2)\n    print(json.dumps(res, indent=2))\n\nif __name__=='__main__': main()"},
  {id:"readme",title:"Project README",file:"README.md",icon:"RM",color:"#34d399",desc:"Setup, architecture, training, evaluation, citation.",
   code:"# Adaptive Gradient Routing YOLO\n\n> Input-adaptive feature fusion for real-time object detection\n\n## Quick Start\n\n```bash\nconda create -n ayolo python=3.10 -y && conda activate ayolo\npip install torch torchvision pycocotools tqdm pyyaml\nbash download_datasets.sh\npython train.py --data-dir ./data/coco --epochs 5 --batch 4\npython evaluate.py --checkpoint runs/train/best.pt\n```\n\n## Architecture\n\n```\nInput -> Backbone -> Router -> [LightGD | FullGD] -> Head\n```\n\n- **SceneComplexityRouter**: GAP -> MLP -> Sigmoid [0,1]\n- **LightGD**: Conv-only (~40% fewer FLOPs)\n- **FullGD**: Attention + conv (full accuracy)\n- **AdaptiveNeck**: Soft (train) / Hard (inference)\n\n## Files\n\n| File | Purpose |\n|------|--------|\n| adaptive_yolo_experiment.py | Core model |\n| train.py | Training pipeline |\n| evaluate.py | Eval & ablation |\n| download_datasets.sh | Dataset setup |\n| config.yaml | Hyperparameters |\n\n---\n*Generated by AI Research Scientist*"},
];

// ── Utilities ───────────────────────────────────────────────────
const cx = (...c) => c.filter(Boolean).join(" ");
const delay = ms => new Promise(r => setTimeout(r, ms));
function Bar({value,color="#4ade80",label,h=5}){const pct=Math.round((value||0)*100);return(<div style={{marginBottom:6}}>{label&&<div style={{fontSize:10,color:"#6b7a94",marginBottom:3,fontFamily:"var(--m)"}}>{label}</div>}<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:h,background:"#1a2035",borderRadius:h/2,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",borderRadius:h/2,background:`linear-gradient(90deg,${color}66,${color})`,transition:"width .8s cubic-bezier(.4,0,.2,1)"}}/></div><span style={{fontSize:11,fontWeight:600,color,fontFamily:"var(--m)",minWidth:32,textAlign:"right"}}>{pct}%</span></div></div>);}

// ═════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════
export default function App() {
  // ── Mode & Auth ────────────────────────────────────────────
  const [mode, setMode] = useState("demo"); // "demo" | "live"
  const [provider, setProvider] = useState("claude"); // "claude" | "openai"
  const [apiKey, setApiKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [keyStatus, setKeyStatus] = useState("none"); // none | checking | valid | invalid
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState("");

  // ── Pipeline ───────────────────────────────────────────────
  const [query, setQuery] = useState("Improve YOLO object detection speed");
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(-1);
  const [done, setDone] = useState(new Set());
  const [tab, setTab] = useState("overview");
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [codeOpen, setCodeOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reportMd, setReportMd] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [activeScript, setActiveScript] = useState(null);
  const logRef = useRef(null);
  const tmr = useRef(null);

  const log = useCallback((m, t="info") => setLogs(p => [...p, {msg:m, type:t, t:new Date().toLocaleTimeString("en-GB",{hour12:false})}]), []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  const isLive = mode === "live" && apiKey && keyStatus === "valid";
  const providerName = provider === "openai" ? "OpenAI GPT-4o" : "Claude Sonnet 4";

  // ── Validate Key ───────────────────────────────────────────
  const validateKey = useCallback(async (key) => {
    if (!key || key.length < 10) { setKeyStatus("invalid"); return; }
    setKeyStatus("checking");
    try {
      if (provider === "openai") {
        await callOpenAI(key, "Say ok", "test", 5);
      } else {
        await callClaude(key, "Say ok", "test", 10);
      }
      setApiKey(key); setKeyStatus("valid"); setMode("live");
    } catch (e) {
      console.error("Validation:", e);
      setKeyStatus("invalid");
    }
  }, [provider]);

  const copyText = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 1500);
  };

  // ── Pipeline ───────────────────────────────────────────────
  const run = useCallback(async () => {
    setRunning(true); setStage(-1); setDone(new Set()); setResult(null);
    setLogs([]); setTab("overview"); setElapsed(0); setCodeOpen(false); setReportMd(null);
    const t0 = Date.now();
    tmr.current = setInterval(() => setElapsed(Date.now()-t0), 80);

    const live = isLive;
    log("Initializing AI Research Scientist...", "sys");
    log(`Query: "${query}"`, "sys");
    log(live ? `[LIVE] ${providerName} + arXiv` : "[DEMO] Using demo data", live ? "ok" : "hl");

    let papers,summaries,hypotheses,plan,code,evaluation;
    const ai = (sys,msg) => callLLM(provider, apiKey, sys, msg);

    try {
      // S0: Search (always real)
      setStage(0); log("[01] Paper Search >> arXiv API...", "agent");
      const arxiv = await searchArxiv(query, 8);
      papers = arxiv?.length ? arxiv : D.papers;
      log(`  ${papers.length} papers ${arxiv?.length ? "(live arXiv)" : "(cached)"}`, "ok");
      setDone(p => new Set([...p,"search"]));

      // S1: Summarize
      setStage(1); log(`[02] Summarization >> ${live?providerName:"demo"}...`, "agent");
      if (live) {
        try {
          const txt = papers.slice(0,5).map((p,i)=>`[${i+1}] "${p.title}" by ${p.authors.join(", ")}\nAbstract: ${p.abstract}`).join("\n\n");
          summaries = parseJSON(await ai(P.sum, `Query: ${query}\n\n${txt}`));
          log(`  ${summaries.length} summaries (${providerName})`, "ok");
        } catch(e) { log(`  Fallback: ${e.message.slice(0,60)}`, "hl"); summaries = D.summaries; }
      } else { await delay(1500); summaries = D.summaries; log(`  ${summaries.length} summaries`, "ok"); }
      setDone(p => new Set([...p,"summarize"]));

      // S2: Hypothesize
      setStage(2); log(`[03] Hypothesis Gen >> ${live?providerName:"demo"}...`, "agent");
      if (live) {
        try {
          const ctx = summaries.slice(0,5).map(s=>`${s.paper_title}: ${s.key_contributions?.join("; ")||""}`).join("\n");
          hypotheses = parseJSON(await ai(P.hyp, `Goal: ${query}\n\nLiterature:\n${ctx}`));
          if (!Array.isArray(hypotheses)) hypotheses = [hypotheses];
          log(`  ${hypotheses.length} hypotheses (${providerName})`, "ok");
        } catch(e) { log(`  Fallback`, "hl"); hypotheses = D.hypotheses; }
      } else { await delay(1200); hypotheses = D.hypotheses; log(`  ${hypotheses.length} hypotheses`, "ok"); }
      const best = hypotheses.reduce((a,b)=>((a.novelty_score||0)*.6+(a.feasibility_score||0)*.4)>=((b.novelty_score||0)*.6+(b.feasibility_score||0)*.4)?a:b);
      log(`  Selected: "${best.title}"`, "hl");
      setDone(p => new Set([...p,"hypothesize"]));

      // S3: Plan
      setStage(3); log(`[04] Experiment >> ${live?providerName:"demo"}...`, "agent");
      if (live) {
        try { plan = parseJSON(await ai(P.plan, `Research: ${query}\nHypothesis: ${best.title}\n${best.description}`)); log(`  "${plan.title}"`, "ok");
        } catch { plan = D.plan; log("  Fallback", "hl"); }
      } else { await delay(1000); plan = D.plan; log(`  "${plan.title}"`, "ok"); }
      setDone(p => new Set([...p,"plan"]));

      // S4: Code
      setStage(4); log(`[05] Code Gen >> ${live?providerName:"demo"}...`, "agent");
      if (live) {
        try { code = parseJSON(await ai(P.code, `Plan: ${plan.title}\nObjective: ${plan.objective}\nHypothesis: ${best.description}`)); log(`  ${code.filename}`, "ok");
        } catch { code = D.code; log("  Fallback", "hl"); }
      } else { await delay(1400); code = D.code; log(`  ${code.filename}`, "ok"); }
      setDone(p => new Set([...p,"code"]));

      // S5: Evaluate
      setStage(5); log(`[06] Evaluator >> ${live?providerName:"demo"}...`, "agent");
      if (live) {
        try { evaluation = parseJSON(await ai(P.eval, `Query: ${query}\nHypothesis: ${best.title}\nPlan: ${plan.title}\nCode: ${code.filename}\nEvaluate.`)); log(`  Score: ${Math.round((evaluation.overall_score||0)*100)}%`, "ok");
        } catch { evaluation = D.eval; log("  Fallback", "hl"); }
      } else { await delay(1000); evaluation = D.eval; log(`  Score: ${Math.round(evaluation.overall_score*100)}%`, "ok"); }
      log(`  Hypothesis: ${evaluation.hypothesis_validated?"VALIDATED":"NOT VALIDATED"}`, "hl");
      setDone(p => new Set([...p,"evaluate"]));

      clearInterval(tmr.current);
      log("Pipeline complete.", "sys");
      setResult({papers,summaries,hypotheses,plan,code,evaluation});
      setTab("papers");
    } catch(err) {
      clearInterval(tmr.current);
      log(`[ERR] ${err.message}`, "err");
    }
    setRunning(false);
  }, [query, isLive, provider, apiKey, providerName, log]);

  // ── Report ─────────────────────────────────────────────────
  const genReport = useCallback(async () => {
    if (!result) return;
    setReportBusy(true); log("[Report] Generating...", "agent");
    if (isLive) {
      try {
        const md = await callLLM(provider, apiKey,
          "You are an academic research writer. Write thorough, formal reports.",
          `Write 2500+ word academic report for "${query}". Papers: ${result.papers.map((p,i)=>`[${i+1}] ${p.title}`).join("; ")}. Hypothesis: ${result.hypotheses[0]?.title}. Score: ${result.evaluation.overall_score}. Include: Executive Summary, Introduction, Lit Review, Gap Analysis, Hypothesis, Methodology, Implementation, Results, Discussion, Future Work, Conclusion, References.`);
        setReportMd(md); log("[Report] Done (live)", "ok");
      } catch { setReportMd(buildReport(result,query)); log("[Report] Done (fallback)", "hl"); }
    } else { await delay(300); setReportMd(buildReport(result,query)); log("[Report] Done", "ok"); }
    setReportBusy(false);
  }, [result,query,isLive,provider,apiKey,log]);

  const fmt = ms=>{const s=Math.floor(ms/1000);return`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}.${Math.floor((ms%1000)/100)}`};
  const r = result;

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <div style={{minHeight:"100vh",background:"#080c16",color:"#c8d1e0",fontFamily:"var(--b)"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Nunito+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        :root{--d:'Bricolage Grotesque',sans-serif;--b:'Nunito Sans',sans-serif;--m:'IBM Plex Mono',monospace;--g:#4ade80;--bl:#38bdf8;--pu:#c084fc;--am:#fbbf24;--pk:#f472b6;--tl:#34d399;--bg:#080c16;--sf:#0d1525;--bd:#1a2540;--bd2:#2a3a5c;--tx:#c8d1e0;--txd:#6b7a94;--txb:#eef1f6}
        *{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--bd);border-radius:2px}
        @keyframes p{0%,100%{opacity:.35}50%{opacity:1}}@keyframes fu{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .tb{padding:7px 14px;border:1px solid var(--bd);background:0;color:var(--txd);cursor:pointer;font:600 11px var(--m);transition:.2s;border-radius:6px;letter-spacing:.03em}
        .tb:hover{border-color:var(--bd2);color:var(--tx);background:#0d152580}.tb.on{border-color:var(--g);color:var(--g);background:#4ade8008}
        .pn{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:20px}
        .mode-btn{padding:8px 18px;border-radius:8px;font:700 12px var(--d);cursor:pointer;transition:.2s;border:2px solid transparent}
      `}</style>

      {/* Setup Modal */}
      {showSetup&&<div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"#000a",backdropFilter:"blur(6px)"}} onClick={()=>setShowSetup(false)}>
        <div style={{background:"var(--sf)",border:"1px solid var(--bd2)",borderRadius:14,padding:28,width:500,maxWidth:"92vw"}} onClick={e=>e.stopPropagation()}>
          <h2 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)",color:"var(--txb)",marginBottom:14}}>Pipeline Setup</h2>

          {/* Mode Toggle */}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:10,fontWeight:700,color:"var(--txd)",fontFamily:"var(--m)",letterSpacing:".08em",marginBottom:8}}>MODE</div>
            <div style={{display:"flex",gap:8}}>
              <button className="mode-btn" onClick={()=>{setMode("demo");setKeyStatus("none");}} style={{background:mode==="demo"?"#fbbf2415":"transparent",borderColor:mode==="demo"?"var(--am)":"var(--bd)",color:mode==="demo"?"var(--am)":"var(--txd)",flex:1}}>
                <div>Demo</div>
                <div style={{fontSize:9,fontWeight:400,fontFamily:"var(--b)",marginTop:2,opacity:.7}}>Instant results, no key</div>
              </button>
              <button className="mode-btn" onClick={()=>setMode("live")} style={{background:mode==="live"?"#4ade8015":"transparent",borderColor:mode==="live"?"var(--g)":"var(--bd)",color:mode==="live"?"var(--g)":"var(--txd)",flex:1}}>
                <div>Live</div>
                <div style={{fontSize:9,fontWeight:400,fontFamily:"var(--b)",marginTop:2,opacity:.7}}>Real AI agents, needs key</div>
              </button>
            </div>
          </div>

          {/* Provider + Key (only in live mode) */}
          {mode==="live"&&<>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:"var(--txd)",fontFamily:"var(--m)",letterSpacing:".08em",marginBottom:8}}>AI PROVIDER</div>
              <div style={{display:"flex",gap:8}}>
                {[["claude","Claude (Anthropic)","sk-ant-api03-...","console.anthropic.com"],["openai","OpenAI (GPT-4o)","sk-proj-...","platform.openai.com"]].map(([id,name,ph,url])=>(
                  <button key={id} className="mode-btn" onClick={()=>{setProvider(id);setKeyStatus("none");setApiKey("");setKeyInput("");}}
                    style={{background:provider===id?"var(--bl)10":"transparent",borderColor:provider===id?"var(--bl)":"var(--bd)",color:provider===id?"var(--bl)":"var(--txd)",flex:1,padding:"10px 14px"}}>
                    <div style={{fontSize:12}}>{name}</div>
                    <div style={{fontSize:9,fontWeight:400,fontFamily:"var(--m)",marginTop:2,opacity:.6}}>{url}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:"var(--txd)",fontFamily:"var(--m)",letterSpacing:".08em",marginBottom:6}}>API KEY</div>
              <div style={{display:"flex",gap:8}}>
                <input type="password" value={keyInput} onChange={e=>setKeyInput(e.target.value)} placeholder={provider==="openai"?"sk-proj-...":"sk-ant-api03-..."}
                  style={{flex:1,background:"var(--bg)",border:"1px solid var(--bd)",borderRadius:7,padding:"10px 12px",color:"var(--txb)",fontSize:13,fontFamily:"var(--m)",outline:"none"}}/>
                <button onClick={()=>validateKey(keyInput)} disabled={keyStatus==="checking"}
                  style={{padding:"10px 18px",borderRadius:7,border:"none",background:keyStatus==="checking"?"var(--bd)":"var(--g)",color:"var(--bg)",fontWeight:700,fontSize:12,cursor:keyStatus==="checking"?"wait":"pointer",fontFamily:"var(--d)",whiteSpace:"nowrap"}}>
                  {keyStatus==="checking"?"Checking...":"Validate"}
                </button>
              </div>
            </div>

            <div style={{padding:10,borderRadius:7,background:"var(--bg)",border:"1px solid var(--bd)",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:keyStatus==="valid"?"var(--g)":keyStatus==="invalid"?"#ef4444":"var(--bd)"}}/>
                <span style={{fontSize:11,fontFamily:"var(--m)",color:keyStatus==="valid"?"var(--g)":keyStatus==="invalid"?"#ef4444":"var(--txd)"}}>
                  {keyStatus==="none"&&"Enter your API key above"}
                  {keyStatus==="checking"&&"Validating..."}
                  {keyStatus==="valid"&&`Connected to ${providerName}`}
                  {keyStatus==="invalid"&&"Invalid key — check and retry"}
                </span>
              </div>
            </div>

            <div style={{padding:10,borderRadius:7,background:"#4ade8008",border:"1px solid #4ade8020",marginBottom:14,fontSize:11,color:"var(--tx)",fontFamily:"var(--b)",lineHeight:1.6}}>
              <b style={{color:"var(--g)"}}>Cost:</b> ~$0.03-0.08 per full pipeline run ({providerName}). arXiv search is always free.
            </div>
          </>}

          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
            {apiKey&&<button onClick={()=>{setApiKey("");setKeyStatus("none");setKeyInput("");setMode("demo");}} style={{padding:"8px 16px",borderRadius:6,border:"1px solid #ef444440",background:"transparent",color:"#ef4444",fontSize:11,fontFamily:"var(--m)",cursor:"pointer"}}>Clear Key</button>}
            <button onClick={()=>setShowSetup(false)} style={{padding:"8px 20px",borderRadius:6,border:"none",background:"var(--g)",color:"var(--bg)",fontSize:12,fontFamily:"var(--d)",fontWeight:700,cursor:"pointer"}}>Done</button>
          </div>
        </div>
      </div>}

      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",top:-300,right:-200,width:800,height:800,background:"radial-gradient(circle,#4ade8004 0%,transparent 60%)",filter:"blur(100px)"}}/>
      </div>

      <div style={{position:"relative",zIndex:1,maxWidth:1400,margin:"0 auto",padding:"20px 20px 60px"}}>

        {/* ── Header ── */}
        <header style={{marginBottom:20,display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:running?"var(--g)":"#2a3a5c",boxShadow:running?"0 0 10px #4ade80":"none",animation:running?"p 1.2s ease infinite":"none"}}/>
              <span style={{fontSize:10,fontFamily:"var(--m)",color:"var(--txd)",letterSpacing:".12em",textTransform:"uppercase"}}>{running?`Running -- ${fmt(elapsed)}`:done.size===6?"Complete":"Ready"}</span>
            </div>
            <h1 style={{fontSize:28,fontWeight:800,fontFamily:"var(--d)",color:"var(--txb)",letterSpacing:"-.02em"}}>AI Research Scientist</h1>
            <p style={{fontSize:13,color:"var(--txd)",fontFamily:"var(--b)",marginTop:3}}>Six-agent pipeline: search, summarize, hypothesize, plan, code, evaluate</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {r&&<button onClick={genReport} disabled={reportBusy} style={{padding:"9px 18px",borderRadius:8,border:"1px solid var(--am)",background:"transparent",color:"var(--am)",fontFamily:"var(--m)",fontSize:11,fontWeight:600,cursor:reportBusy?"wait":"pointer"}}>{reportBusy?"Generating...":"Generate Report"}</button>}
            {/* Mode Badge + Setup Button */}
            <button onClick={()=>setShowSetup(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:8,border:`1px solid ${isLive?"var(--g)":"var(--am)"}`,background:isLive?"#4ade8008":"#fbbf2408",color:isLive?"var(--g)":"var(--am)",fontFamily:"var(--m)",fontSize:11,fontWeight:600,cursor:"pointer",transition:".2s"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:isLive?"var(--g)":"var(--am)"}}/>
              {isLive?`Live -- ${provider==="openai"?"GPT-4o":"Claude"}`:"Demo"}
            </button>
          </div>
        </header>

        {/* ── Input Bar ── */}
        <div style={{display:"flex",gap:10,marginBottom:22,background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:10,padding:5}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!running&&run()} placeholder="Enter research query..." style={{flex:1,background:"transparent",border:"none",outline:"none",color:"var(--txb)",fontSize:14,padding:"9px 12px",fontFamily:"var(--b)"}}/>
          <button onClick={run} disabled={running||!query.trim()} style={{padding:"9px 24px",borderRadius:7,border:"none",background:running?"var(--bd)":"var(--g)",color:running?"var(--txd)":"var(--bg)",fontWeight:700,fontSize:13,cursor:running?"not-allowed":"pointer",fontFamily:"var(--d)",transition:".3s"}}>{running?"Running...":"Launch"}</button>
        </div>

        {/* ── Pipeline Strip ── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,marginBottom:22}}>
          {AGENTS.map((a,i)=>{const ac=stage===i,dn=done.has(a.key);return(
            <div key={a.key} style={{padding:"12px 10px",borderRadius:8,background:dn?`${a.color}06`:"var(--sf)",border:`1px solid ${ac?a.color:dn?`${a.color}25`:"var(--bd)"}`,transition:".35s",position:"relative",overflow:"hidden"}}>
              {ac&&<div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${a.color}06,transparent)`}}/>}
              <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:16,fontWeight:700,fontFamily:"var(--m)",color:dn||ac?a.color:"#1e2d48"}}>{a.num}</span>
                {dn&&<span style={{color:a.color,fontSize:12}}>&#10003;</span>}
                {ac&&<div style={{width:6,height:6,borderRadius:"50%",background:a.color,animation:"p .8s ease infinite",boxShadow:`0 0 8px ${a.color}`}}/>}
              </div>
              <div style={{fontSize:10,fontWeight:600,color:dn||ac?"var(--tx)":"#3a4a68",fontFamily:"var(--b)",marginTop:4}}>{a.label}</div>
            </div>);})}
        </div>

        {/* ── Content + Log Grid ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:16}}>
          <div>
            <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
              {TABS.map(t=><button key={t} className={cx("tb",tab===t&&"on")} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}
            </div>
            <div style={{minHeight:440}}>

              {/* OVERVIEW */}
              {tab==="overview"&&<div className="pn" style={{animation:"fu .3s ease"}}>
                <h3 style={{fontSize:15,fontWeight:700,fontFamily:"var(--d)",color:"var(--txb)",marginBottom:14}}>Multi-Agent Architecture</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {AGENTS.map(a=><div key={a.key} style={{padding:12,borderRadius:7,background:"var(--bg)",border:"1px solid var(--bd)",display:"flex",gap:10}}>
                    <span style={{fontSize:17,fontWeight:700,fontFamily:"var(--m)",color:a.color}}>{a.num}</span>
                    <div><div style={{fontSize:12,fontWeight:700,color:"var(--txb)",fontFamily:"var(--b)"}}>{a.label}</div><div style={{fontSize:10.5,color:"var(--txd)",fontFamily:"var(--b)",lineHeight:1.4}}>{a.role}</div></div>
                  </div>)}
                </div>
                <div style={{marginTop:14,padding:12,borderRadius:7,background:"var(--bg)",border:"1px solid var(--bd)"}}>
                  <div style={{fontSize:10,color:"var(--txd)",fontFamily:"var(--m)",letterSpacing:".08em",marginBottom:6}}>CURRENT MODE</div>
                  <div style={{fontSize:12,color:"var(--tx)",fontFamily:"var(--m)",lineHeight:1.8}}>
                    {isLive ? <><span style={{color:"var(--g)"}}>LIVE</span> &mdash; arXiv + {providerName} for all agents</> : <><span style={{color:"var(--am)"}}>DEMO</span> &mdash; cached data, no API calls</>}
                    <br/><span style={{color:"var(--txd)",cursor:"pointer",textDecoration:"underline"}} onClick={()=>setShowSetup(true)}>Change in Settings</span>
                  </div>
                </div>
              </div>}

              {/* PAPERS */}
              {tab==="papers"&&r&&<div style={{display:"flex",flexDirection:"column",gap:8,animation:"fu .3s ease"}}>
                {r.papers.map((p,i)=>{const sm=r.summaries?.[i]||r.summaries?.find(s=>s.paper_title===p.title);return(
                  <div key={i} className="pn" style={{padding:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
                      <div style={{flex:1}}>
                        <a href={p.url} target="_blank" rel="noreferrer" style={{fontSize:13,fontWeight:700,color:"var(--bl)",textDecoration:"none",fontFamily:"var(--b)",lineHeight:1.35}}>{p.title}</a>
                        <div style={{fontSize:10.5,color:"var(--txd)",marginTop:3,fontFamily:"var(--b)"}}>{p.authors.join(", ")} &middot; {p.published}</div>
                      </div>
                      {sm&&<span style={{padding:"3px 9px",borderRadius:10,fontSize:10,fontWeight:600,fontFamily:"var(--m)",background:sm.relevance_score>.9?"#4ade8012":"#38bdf812",color:sm.relevance_score>.9?"var(--g)":"var(--bl)",whiteSpace:"nowrap"}}>{Math.round(sm.relevance_score*100)}%</span>}
                    </div>
                    {sm&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid var(--bd)",fontSize:11.5,color:"var(--tx)",fontFamily:"var(--b)",lineHeight:1.45}}>
                      <b style={{color:"var(--txb)"}}>Key:</b> {sm.key_contributions?.join(" / ")||"N/A"}
                      <div style={{fontSize:10.5,color:"var(--txd)",marginTop:3}}><b>Method:</b> {sm.methodology||"N/A"} &middot; <b>Results:</b> {sm.results||"N/A"}</div>
                    </div>}
                    {!sm&&p.abstract&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid var(--bd)",fontSize:11,color:"var(--txd)",fontFamily:"var(--b)",lineHeight:1.5}}>{p.abstract.slice(0,250)}...</div>}
                  </div>);})}
              </div>}

              {/* HYPOTHESES */}
              {tab==="hypotheses"&&r&&<div style={{display:"flex",flexDirection:"column",gap:10,animation:"fu .3s ease"}}>
                {r.hypotheses.map((h,i)=><div key={i} className="pn" style={{borderColor:i===0?"#4ade8030":"var(--bd)",position:"relative"}}>
                  {i===0&&<div style={{position:"absolute",top:10,right:12,padding:"2px 9px",borderRadius:8,background:"#4ade8012",color:"var(--g)",fontSize:9,fontWeight:700,fontFamily:"var(--m)"}}>SELECTED</div>}
                  <h4 style={{fontSize:14,fontWeight:700,color:"var(--txb)",fontFamily:"var(--d)",marginBottom:6,paddingRight:i===0?70:0}}>{h.title}</h4>
                  <p style={{fontSize:12,color:"var(--tx)",lineHeight:1.55,fontFamily:"var(--b)",marginBottom:10}}>{h.description}</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <Bar value={h.novelty_score} color="var(--pu)" label="Novelty"/>
                    <Bar value={h.feasibility_score} color="var(--bl)" label="Feasibility"/>
                  </div>
                  {h.rationale&&<div style={{marginTop:8,padding:10,background:"var(--bg)",borderRadius:6,fontSize:11,color:"var(--txd)",fontFamily:"var(--b)",lineHeight:1.5}}><b style={{color:"var(--tx)"}}>Rationale:</b> {h.rationale}</div>}
                </div>)}
              </div>}

              {/* EXPERIMENT */}
              {tab==="experiment"&&r&&<div className="pn" style={{animation:"fu .3s ease"}}>
                <h3 style={{fontSize:16,fontWeight:800,fontFamily:"var(--d)",color:"var(--txb)",marginBottom:4}}>{r.plan.title}</h3>
                <p style={{fontSize:12,color:"var(--txd)",fontFamily:"var(--b)",lineHeight:1.5,marginBottom:12}}>{r.plan.objective}</p>
                {r.plan.methodology&&<div style={{fontSize:12,color:"var(--tx)",fontFamily:"var(--b)",lineHeight:1.5,marginBottom:12}}><b>Methodology:</b> {r.plan.methodology}</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                  <div><div style={{fontSize:10,fontWeight:700,color:"var(--txd)",fontFamily:"var(--m)",marginBottom:6,letterSpacing:".08em"}}>DATASETS</div>{(r.plan.datasets||[]).map((d,i)=><div key={i} style={{fontSize:12,color:"var(--tx)",fontFamily:"var(--b)",marginBottom:3,paddingLeft:8,borderLeft:"2px solid var(--bl)"}}>{d}</div>)}</div>
                  <div><div style={{fontSize:10,fontWeight:700,color:"var(--txd)",fontFamily:"var(--m)",marginBottom:6,letterSpacing:".08em"}}>METRICS</div>{(r.plan.metrics||[]).map((m,i)=><div key={i} style={{fontSize:12,color:"var(--tx)",fontFamily:"var(--b)",marginBottom:3,paddingLeft:8,borderLeft:"2px solid var(--am)"}}>{m}</div>)}</div>
                </div>
                <div style={{fontSize:10,fontWeight:700,color:"var(--txd)",fontFamily:"var(--m)",marginBottom:8,letterSpacing:".08em"}}>STEPS</div>
                {(r.plan.steps||[]).map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:7}}><span style={{minWidth:18,height:18,borderRadius:"50%",background:"var(--bd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"var(--txd)",fontFamily:"var(--m)"}}>{i+1}</span><span style={{fontSize:12,color:"var(--tx)",fontFamily:"var(--b)",lineHeight:1.4}}>{s}</span></div>)}
              </div>}

              {/* CODE */}
              {tab==="code"&&r&&<div className="pn" style={{animation:"fu .3s ease",padding:0,overflow:"hidden"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid var(--bd)",background:"var(--bg)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{display:"flex",gap:4}}><div style={{width:7,height:7,borderRadius:"50%",background:"#ef4444"}}/><div style={{width:7,height:7,borderRadius:"50%",background:"#fbbf24"}}/><div style={{width:7,height:7,borderRadius:"50%",background:"#22c55e"}}/></div><span style={{fontSize:11,color:"var(--txd)",fontFamily:"var(--m)"}}>{r.code.filename}</span></div>
                  <div style={{display:"flex",gap:6}}><button onClick={()=>copyText(r.code.code,"code")} style={{padding:"3px 8px",borderRadius:4,border:"1px solid var(--bd)",background:"transparent",color:copied==="code"?"var(--g)":"var(--txd)",cursor:"pointer",fontSize:10,fontFamily:"var(--m)"}}>{copied==="code"?"Copied":"Copy"}</button><button onClick={()=>setCodeOpen(!codeOpen)} style={{padding:"3px 8px",borderRadius:4,border:"1px solid var(--bd)",background:"transparent",color:"var(--txd)",cursor:"pointer",fontSize:10,fontFamily:"var(--m)"}}>{codeOpen?"Collapse":"Expand"}</button></div>
                </div>
                <pre style={{padding:14,margin:0,fontSize:11,lineHeight:1.55,fontFamily:"var(--m)",color:"#8892a4",overflow:"auto",maxHeight:codeOpen?"none":380,background:"var(--sf)"}}><code>{r.code.code}</code></pre>
                <div style={{padding:"8px 14px",borderTop:"1px solid var(--bd)",display:"flex",gap:5,flexWrap:"wrap"}}>{(r.code.dependencies||[]).map((d,i)=><span key={i} style={{padding:"2px 7px",borderRadius:4,background:"var(--bd)",fontSize:9,color:"var(--txd)",fontFamily:"var(--m)"}}>{d}</span>)}</div>
              </div>}

              {/* REPORT */}
              {tab==="report"&&r&&<div style={{display:"flex",flexDirection:"column",gap:10,animation:"fu .3s ease"}}>
                <div className="pn" style={{borderColor:"#4ade8020"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                    <h3 style={{fontSize:15,fontWeight:700,fontFamily:"var(--d)"}}>Evaluation</h3>
                    <div style={{width:56,height:56,borderRadius:"50%",border:`3px solid ${(r.evaluation.overall_score||0)>=.7?"var(--g)":"var(--am)"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:18,fontWeight:700,color:(r.evaluation.overall_score||0)>=.7?"var(--g)":"var(--am)",fontFamily:"var(--m)"}}>{Math.round((r.evaluation.overall_score||0)*100)}</span><span style={{fontSize:7,color:"var(--txd)",fontFamily:"var(--m)"}}>SCORE</span></div>
                  </div>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--txd)",fontFamily:"var(--m)",marginBottom:8,letterSpacing:".08em"}}>KEY FINDINGS</div>
                  {(r.evaluation.key_findings||[]).map((f,i)=><div key={i} style={{display:"flex",gap:7,marginBottom:4}}><span style={{color:"var(--g)",fontSize:8,marginTop:4}}>&#9656;</span><span style={{fontSize:12,color:"var(--tx)",fontFamily:"var(--b)",lineHeight:1.45}}>{f}</span></div>)}
                </div>
                <div className="pn">
                  <div style={{fontSize:10,fontWeight:700,color:"var(--txd)",fontFamily:"var(--m)",marginBottom:10,letterSpacing:".08em"}}>METRICS</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:6}}>{Object.entries(r.evaluation.metrics_summary||{}).map(([k,v])=><div key={k} style={{padding:9,background:"var(--bg)",borderRadius:6,border:"1px solid var(--bd)"}}><div style={{fontSize:9,color:"var(--txd)",fontFamily:"var(--m)",marginBottom:3}}>{k}</div><div style={{fontSize:13,fontWeight:700,color:"var(--txb)",fontFamily:"var(--m)"}}>{v}</div></div>)}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div className="pn"><div style={{fontSize:10,fontWeight:700,color:"var(--g)",fontFamily:"var(--m)",marginBottom:8}}>STRENGTHS</div>{(r.evaluation.strengths||[]).map((s,i)=><div key={i} style={{fontSize:11,color:"var(--tx)",marginBottom:5,fontFamily:"var(--b)",lineHeight:1.4,paddingLeft:8,borderLeft:"2px solid #4ade8025"}}>{s}</div>)}</div>
                  <div className="pn"><div style={{fontSize:10,fontWeight:700,color:"var(--am)",fontFamily:"var(--m)",marginBottom:8}}>WEAKNESSES</div>{(r.evaluation.weaknesses||[]).map((w,i)=><div key={i} style={{fontSize:11,color:"var(--tx)",marginBottom:5,fontFamily:"var(--b)",lineHeight:1.4,paddingLeft:8,borderLeft:"2px solid #fbbf2425"}}>{w}</div>)}</div>
                </div>
                <div className="pn" style={{borderColor:"#c084fc30"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{fontSize:10,fontWeight:700,color:"var(--pu)",fontFamily:"var(--m)"}}>NEXT STEPS</div><button onClick={()=>setTab("toolkit")} className="tb" style={{padding:"5px 12px",borderColor:"var(--pu)",color:"var(--pu)"}}>Toolkit &rarr;</button></div>{(r.evaluation.next_steps||[]).map((n,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6}}><span style={{minWidth:18,height:18,borderRadius:4,background:"#c084fc10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"var(--pu)",fontFamily:"var(--m)"}}>{i+1}</span><span style={{fontSize:12,color:"var(--tx)",fontFamily:"var(--b)",lineHeight:1.45}}>{n}</span></div>)}</div>
                <div className="pn" style={{textAlign:"center",padding:24,borderStyle:"dashed",borderColor:"var(--am)"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--txb)",fontFamily:"var(--d)",marginBottom:6}}>Full Research Report</div>
                  <div style={{fontSize:11,color:"var(--txd)",fontFamily:"var(--b)",marginBottom:14}}>2500+ word academic report{isLive?` via ${providerName}`:", generated offline"}.</div>
                  <button onClick={genReport} disabled={reportBusy} style={{padding:"10px 28px",borderRadius:8,border:"none",background:reportBusy?"var(--bd)":"linear-gradient(135deg,var(--am),#f59e0b)",color:reportBusy?"var(--txd)":"var(--bg)",fontWeight:700,fontSize:13,cursor:reportBusy?"wait":"pointer",fontFamily:"var(--d)"}}>{reportBusy?"Generating...":"Generate Report"}</button>
                </div>
                {reportMd&&<div className="pn" style={{borderColor:"#fbbf2430"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><h3 style={{fontSize:14,fontWeight:700,fontFamily:"var(--d)",color:"var(--am)"}}>Report</h3><button onClick={()=>copyText(reportMd,"rpt")} style={{padding:"4px 10px",borderRadius:4,border:"1px solid var(--bd)",background:"transparent",color:copied==="rpt"?"var(--g)":"var(--txd)",cursor:"pointer",fontSize:10,fontFamily:"var(--m)"}}>{copied==="rpt"?"Copied":"Copy MD"}</button></div>
                  <div style={{maxHeight:500,overflow:"auto",padding:14,background:"var(--bg)",borderRadius:7,border:"1px solid var(--bd)"}}><pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",fontSize:11,lineHeight:1.65,fontFamily:"var(--b)",color:"var(--tx)",margin:0}}>{reportMd}</pre></div>
                </div>}
              </div>}

              {/* TOOLKIT */}
              {tab==="toolkit"&&r&&<div style={{display:"flex",flexDirection:"column",gap:10,animation:"fu .3s ease"}}>
                <div className="pn" style={{borderColor:"#c084fc30"}}><h3 style={{fontSize:16,fontWeight:800,fontFamily:"var(--d)",color:"var(--txb)",marginBottom:4}}>Research Toolkit</h3><p style={{fontSize:12,color:"var(--txd)",fontFamily:"var(--b)"}}>Ready-to-run scripts. Copy into your project and execute.</p></div>
                {TK.map(sc=>{const open=activeScript===sc.id;return(
                  <div key={sc.id} className="pn" style={{padding:0,overflow:"hidden",borderColor:open?`${sc.color}40`:"var(--bd)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",cursor:"pointer",background:open?`${sc.color}06`:"transparent"}} onClick={()=>setActiveScript(open?null:sc.id)}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:36,height:36,borderRadius:8,background:`${sc.color}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,fontFamily:"var(--m)",color:sc.color}}>{sc.icon}</div>
                        <div><div style={{fontSize:13,fontWeight:700,color:"var(--txb)",fontFamily:"var(--d)"}}>{sc.title}</div><div style={{fontSize:10.5,color:"var(--txd)",fontFamily:"var(--m)"}}>{sc.file}</div></div>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <button onClick={e=>{e.stopPropagation();copyText(sc.code,sc.id);}} style={{padding:"5px 12px",borderRadius:5,border:`1px solid ${sc.color}40`,background:"transparent",color:copied===sc.id?"var(--txb)":sc.color,cursor:"pointer",fontSize:10,fontFamily:"var(--m)",fontWeight:600}}>{copied===sc.id?"Copied":"Copy"}</button>
                        <span style={{fontSize:16,color:"var(--txd)",transform:open?"rotate(180deg)":"",transition:".2s"}}>&#9662;</span>
                      </div>
                    </div>
                    <div style={{padding:"0 16px 10px",fontSize:11,color:"var(--txd)",fontFamily:"var(--b)"}}>{sc.desc}</div>
                    {open&&<div style={{borderTop:"1px solid var(--bd)"}}><pre style={{padding:14,margin:0,fontSize:10.5,lineHeight:1.5,fontFamily:"var(--m)",color:"#8892a4",overflow:"auto",maxHeight:500,background:"var(--bg)"}}><code>{sc.code}</code></pre></div>}
                  </div>);})}
                <div className="pn" style={{background:"var(--bg)",border:"1px dashed var(--bd2)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--tl)",fontFamily:"var(--m)",marginBottom:10}}>QUICK START</div>
                  <pre style={{fontSize:11,lineHeight:1.8,fontFamily:"var(--m)",color:"var(--tx)",margin:0,whiteSpace:"pre-wrap"}}>{`mkdir adaptive-yolo && cd adaptive-yolo
# Copy all files, then:
bash download_datasets.sh
python train.py --data-dir ./data/coco --epochs 5 --batch 4
python evaluate.py --checkpoint runs/train/best.pt`}</pre>
                </div>
              </div>}

              {!r&&tab!=="overview"&&<div className="pn" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:300}}><div style={{textAlign:"center",opacity:.4}}><div style={{fontSize:28,marginBottom:10}}>&#9881;</div><div style={{fontSize:12,fontFamily:"var(--b)"}}>Launch the pipeline to see results</div></div></div>}
            </div>
          </div>

          {/* LOG */}
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--txd)",fontFamily:"var(--m)",marginBottom:8,letterSpacing:".08em"}}>AGENT LOG</div>
            <div ref={logRef} className="pn" style={{height:560,overflow:"auto",padding:10,fontFamily:"var(--m)",fontSize:10.5,lineHeight:1.65}}>
              {logs.length===0&&<div style={{color:"#1e2d48",textAlign:"center",marginTop:80}}>Awaiting launch...</div>}
              {logs.map((l,i)=><div key={i} style={{marginBottom:1,animation:"fu .15s ease",color:l.type==="sys"?"var(--txd)":l.type==="agent"?"var(--pu)":l.type==="ok"?"var(--g)":l.type==="hl"?"var(--am)":l.type==="err"?"#ef4444":"#6b7a94"}}><span style={{color:"#1e2d48"}}>{l.t}</span> {l.type==="ok"&&"[OK] "}{l.type==="err"&&"[ERR] "}{l.msg}</div>)}
              {running&&<div style={{color:"var(--g)",animation:"p .8s ease infinite"}}>&#x2588;</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildReport(r,q){const{papers:p=[],summaries:s=[],hypotheses:h=[],plan:pl={},evaluation:ev={}}=r;return`# AI Research Report: ${q}\n\n## Executive Summary\nAutomated pipeline analyzed ${p.length} papers, generated ${h.length} hypotheses. Score: ${Math.round((ev.overall_score||0)*100)}%.\n\n## Literature Review\n${p.map((x,i)=>`### [${i+1}] ${x.title}\n${x.authors.join(", ")} (${x.published})\n${s[i]?`Contributions: ${s[i].key_contributions?.join("; ")||"N/A"}\nMethod: ${s[i].methodology||"N/A"}\nResults: ${s[i].results||"N/A"}`:x.abstract?.slice(0,200)||""}\n`).join("\n")}\n\n## Hypothesis: ${h[0]?.title||"N/A"}\n${h[0]?.description||""}\nNovelty: ${Math.round((h[0]?.novelty_score||0)*100)}% | Feasibility: ${Math.round((h[0]?.feasibility_score||0)*100)}%\n\n## Experiment: ${pl.title||"N/A"}\n${pl.methodology||""}\nDatasets: ${pl.datasets?.join(", ")||"N/A"}\nMetrics: ${pl.metrics?.join(", ")||"N/A"}\n\n## Results\nScore: ${Math.round((ev.overall_score||0)*100)}% | Validated: ${ev.hypothesis_validated?"Yes":"No"}\n${(ev.key_findings||[]).map((f,i)=>`${i+1}. ${f}`).join("\n")}\n\n## Future Work\n${(ev.next_steps||[]).map((s,i)=>`${i+1}. ${s}`).join("\n")}\n\n## References\n${p.map((x,i)=>`[${i+1}] ${x.authors.join(", ")}. "${x.title}." ${x.published}. ${x.url}`).join("\n")}\n\n---\n*Generated ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}*`;}
