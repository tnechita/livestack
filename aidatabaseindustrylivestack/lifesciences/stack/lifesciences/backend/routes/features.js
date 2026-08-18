const express=require('express'); const {collectFeatureEvidence}=require('../lib/datasetFeatureEvidence'); const {getActiveFeatureEvidence}=require('../lib/datasetGenerationStore'); const router=express.Router();
router.get('/evidence',async(_req,res)=>{try{return res.json({ok:true,generation:await getActiveFeatureEvidence(),observed:await collectFeatureEvidence()});}catch(_){return res.status(503).json({ok:false,error:'Life Sciences feature evidence is unavailable.'});}});
module.exports=router;
