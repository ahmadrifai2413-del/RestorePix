import base64
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np
from fastapi.testclient import TestClient
from PIL import Image
from test_api import app, image_bytes, ROOT
from app.processing.old_photo_restoration import apply
from app.processing import photo_colorization
from app.processing.scratch_suggestions import suggest


class OldPhotoAddon(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.original = cv2.imread(str(ROOT / 'frontend/public/assets/old-photo-sample.webp'))
        raw = cv2.imencode('.png', self.original)[1].tobytes()
        r = self.client.post('/api/images/upload', files={'file': ('aged.png', raw, 'image/png')})
        self.assertEqual(r.status_code, 200, r.text)
        self.photo = r.json()

    def run_tool(self, params, **extra):
        return self.client.post('/api/images/process', json={
            'image_id': self.photo['id'], 'tool': 'oldphoto', 'params': params, **extra})

    def pixels(self, item):
        raw = self.client.get('/api/images/' + item['id'] + '/download').content
        return cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)

    def test_real_model_colorizes_and_preserves_resolution_and_source(self):
        self.assertTrue(self.client.get('/api/old-photo/capabilities').json()['colorization'])
        r = self.run_tool({'colorize': True, 'color_strength': .8, 'amount': .85})
        self.assertEqual(r.status_code, 200, r.text)
        item = r.json(); out = self.pixels(item)
        self.assertEqual(out.shape, self.original.shape)
        self.assertGreater(np.std(out.astype(float), axis=2).mean(), 3)
        # The model predicts chroma, not new spatial facial detail.
        plain = apply(self.original, colorize=False, amount=.85)
        y1 = cv2.cvtColor(plain.astype(np.float32)/255, cv2.COLOR_BGR2LAB)[:,:,0]
        y2 = cv2.cvtColor(out.astype(np.float32)/255, cv2.COLOR_BGR2LAB)[:,:,0]
        self.assertLess(np.mean(np.abs(y1-y2)), 2)
        np.testing.assert_array_equal(self.pixels(self.photo), self.original)
        self.assertEqual(item['root'], self.photo['id'])
        self.assertEqual(self.client.get('/api/history').json()[0]['id'], item['id'])

    def test_presets_zero_and_neutral_output(self):
        results = [apply(self.original, preset=p, colorize=False) for p in ['gentle', 'balanced', 'strong']]
        self.assertFalse(np.array_equal(results[0], results[1]))
        self.assertFalse(np.array_equal(results[1], results[2]))
        np.testing.assert_array_equal(apply(self.original, amount=0, colorize=True), self.original)
        neutral = apply(self.original, tone='neutral', colorize=False)
        np.testing.assert_array_equal(neutral[:,:,0], neutral[:,:,1])
        np.testing.assert_array_equal(neutral[:,:,1], neutral[:,:,2])

    def test_selected_scratches_repaired_and_suggested(self):
        clean = np.full((160,180,3), 115, np.uint8)
        broken = clean.copy(); broken[20:140,80:82] = 245
        mask = np.zeros(clean.shape[:2], np.uint8); mask[19:141,79:83] = 255
        restored = apply(broken, mask=mask, amount=.85)
        error_before = abs(broken.astype(float)-clean)[mask > 0].mean()
        error_after = abs(restored.astype(float)-clean)[mask > 0].mean()
        self.assertLess(error_after, error_before)
        automatic = suggest(broken)
        self.assertGreater(np.count_nonzero(automatic[20:140,80:82]), 180)

    def test_suggestion_ownership_overlay_and_no_history_side_effect(self):
        r = self.client.post('/api/images/old-photo-mask', json={'image_id': self.photo['id']})
        self.assertEqual(r.status_code, 200, r.text)
        overlay = np.array(Image.open(io.BytesIO(base64.b64decode(r.json()['mask']))))
        self.assertEqual(overlay.shape, (*self.original.shape[:2],4))
        self.assertLessEqual(r.json()['coverage'], 8)
        self.assertEqual(self.client.get('/api/history').json(), [])
        other = TestClient(app)
        self.assertEqual(other.post('/api/images/old-photo-mask', json={'image_id':self.photo['id']}).status_code,404)

    def test_validation_does_not_create_results(self):
        for params in [{'colorize':'yes'}, {'color_strength':2}, {'mode':'enhanced'}, {'preset':[]}, {'amount':True}, {'bad':1}]:
            with self.subTest(params=params):
                self.assertEqual(self.run_tool(params).status_code, 422)
        wrong = np.full((20,20),255,np.uint8)
        for mask in [wrong, np.full(self.original.shape[:2],255,np.uint8)]:
            r=self.run_tool({},mask=base64.b64encode(image_bytes(mask)).decode())
            self.assertEqual(r.status_code,422,r.text)
        self.assertEqual(self.client.get('/api/history').json(),[])

    def test_missing_model_is_clear_and_basic_restoration_still_works(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(photo_colorization,'MODEL_DIR',Path(temp)), patch.object(photo_colorization,'_net',None):
            self.assertFalse(self.client.get('/api/old-photo/capabilities').json()['colorization'])
            self.assertEqual(self.run_tool({'colorize':True}).status_code,422)
            self.assertEqual(self.run_tool({'colorize':False}).status_code,200)


if __name__ == '__main__':
    unittest.main()
