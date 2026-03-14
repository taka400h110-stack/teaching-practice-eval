from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
import pandas as pd
import numpy as np
import pingouin as pg
import statsmodels.api as sm
import statsmodels.formula.api as smf
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Teaching Practice Eval - Stats API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ICCRequest(BaseModel):
    ratings: List[List[float]]  # [rater][subject]
    factor: Optional[str] = "total"

class BlandAltmanRequest(BaseModel):
    method1: List[float]
    method2: List[float]
    factor: Optional[str] = "total"

class LGCMRequest(BaseModel):
    weekly_scores: List[List[float]]
    factor: Optional[str] = "total"

@app.get("/")
def read_root():
    return {"status": "ok", "service": "teaching-practice-eval-stats-api"}

@app.post("/api/icc")
def compute_icc(req: ICCRequest):
    try:
        # Convert to long format for pingouin
        # ratings shape: [k raters][n subjects]
        k = len(req.ratings)
        if k < 2:
            raise ValueError("At least 2 raters required")
        n = len(req.ratings[0])
        
        data = []
        for rater_idx in range(k):
            for subj_idx in range(n):
                data.append({
                    "rater": f"Rater_{rater_idx+1}",
                    "subject": f"Subj_{subj_idx+1}",
                    "score": req.ratings[rater_idx][subj_idx]
                })
        df = pd.DataFrame(data)
        
        # Calculate ICC
        icc_res = pg.intraclass_corr(data=df, targets="subject", raters="rater", ratings="score")
        
        # For absolute agreement, ICC(2,1) or ICC2 in pingouin (Type="ICC2")
        icc2 = icc_res[icc_res['Type'] == 'ICC2'].iloc[0]
        
        return {
            "success": True,
            "factor": req.factor,
            "icc": round(float(icc2['ICC']), 3),
            "ci95": [round(float(icc2['CI95%'][0]), 3), round(float(icc2['CI95%'][1]), 3)],
            "f": round(float(icc2['F']), 2),
            "df1": int(icc2['df1']),
            "df2": int(icc2['df2']),
            "p": round(float(icc2['pval']), 4),
            "interpretation": "良好な信頼性" if float(icc2['ICC']) >= 0.75 else "低い信頼性"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bland-altman")
def compute_bland_altman(req: BlandAltmanRequest):
    try:
        m1 = np.array(req.method1)
        m2 = np.array(req.method2)
        diff = m1 - m2
        mean_val = (m1 + m2) / 2
        
        md = np.mean(diff)
        sd = np.std(diff, ddof=1)
        
        loa_upper = md + 1.96 * sd
        loa_lower = md - 1.96 * sd
        
        # Proportional bias (Linear Regression: diff ~ mean)
        df = pd.DataFrame({"diff": diff, "mean": mean_val})
        model = smf.ols("diff ~ mean", data=df).fit()
        p_val_slope = model.pvalues["mean"]
        
        return {
            "success": True,
            "factor": req.factor,
            "mean_diff": round(float(md), 3),
            "sd_diff": round(float(sd), 3),
            "loa_upper": round(float(loa_upper), 3),
            "loa_lower": round(float(loa_lower), 3),
            "proportional_bias": {
                "slope": round(float(model.params["mean"]), 3),
                "intercept": round(float(model.params["Intercept"]), 3),
                "p_value": round(float(p_val_slope), 4),
                "detected": bool(p_val_slope < 0.05)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
