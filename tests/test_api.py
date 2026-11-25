import base64
import io
import os
from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
storage = tempfile.TemporaryDirectory()
os.environ["RESTOREPIX_STORAGE"] = storage.name
from app.main import app


def image_bytes(pixels):
    stream=io.BytesIO()
    Image.fromarray(pixels).save(stream,"PNG")
    return stream.getvalue()


class PhotoWorkflow(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.raw = np.random.default_rng(2026).integers(0,255,(40,60,3),dtype=np.uint8)
        response=self.client.post("/api/images/upload",files={"file":("photo.png",image_bytes(self.raw),"image/png")})
        self.assertEqual(response.status_code,200,response.text)
        self.photo=response.json()

    def apply(self, key, settings=None, **extra):
        return self.client.post("/api/images/process",json={"image_id":self.photo["id"],"tool":key,"params":settings or {},**extra})

    def test_methods_and_history(self):
        for key, params in [("restore",{}),("light",{}),("denoise",{"method":"median"}),("denoise",{"method":"nlm"}),("color",{}),("sharpen",{}),
                            ("upscale",{"scale":2,"method":"bicubic"}),("upscale",{"scale":4,"method":"lanczos"})]:
            with self.subTest(tool=key,params=params):
                res=self.apply(key,params)
                self.assertEqual(res.status_code,200,res.text)
                item=res.json()
                self.assertEqual(item["root"],self.photo["id"])
                self.assertEqual(item["width"],60*params.get("scale",1))
                self.assertGreater(item["size"],0)
                self.assertEqual(self.client.get("/api/images/"+item["id"]).json(),item)
        history=self.client.get("/api/history").json()
        self.assertEqual(len(history),8)
        result_id=history[0]["id"]
        self.assertEqual(self.client.get("/api/images/"+result_id+"/download").headers["content-type"],"image/png")
        self.assertEqual(self.client.delete("/api/history/"+result_id).status_code,200)
        self.assertEqual(self.client.get("/api/images/"+result_id).status_code,404)
        self.assertEqual(len(self.client.get("/api/history").json()),7)

    def test_mask(self):
        mask=np.zeros(self.raw.shape[:2],np.uint8)
        mask[8:15,18:20]=255
        res=self.apply("repair",mask=base64.b64encode(image_bytes(mask)).decode())
        self.assertEqual(res.status_code,200,res.text)
        photo=np.array(Image.open(io.BytesIO(self.client.get("/api/images/"+res.json()["id"]+"/download").content)))
        np.testing.assert_array_equal(photo[mask==0],self.raw[mask==0])
        self.assertTrue(np.any(photo[mask>0]!=self.raw[mask>0]))

    def test_analyze(self):
        res=self.client.post("/api/images/analyze",json={"image_id":self.photo["id"]})
        self.assertEqual(res.status_code,200)
        self.assertEqual(sum(res.json()["histogram"]),40*60)

    def test_validation(self):
        for key,params in [("invalid",{}),("sharpen",{"amount":3}),("upscale",{"scale":3}),("repair",{}),("denoise",{"kernel":4}),("light",{"unknown":1})]:
            self.assertEqual(self.apply(key,params).status_code,422)
        self.assertEqual(self.client.post("/api/images/upload",files={"file":("valid.jpg",b"broken","image/jpeg")}).status_code,422)
        self.assertEqual(self.client.post("/api/images/upload",files={"file":("big.jpg",bytes(12*1024**2+1),"image/jpeg")}).status_code,413)

    def test_session_isolation(self):
        other=TestClient(app)
        self.assertEqual(other.get("/api/images/"+self.photo["id"]+"/download").status_code,404)
        self.assertEqual(other.get("/api/history").json(),[])
