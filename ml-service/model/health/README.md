---
license: apache-2.0
tags:
  - image-classification
  - cattle-disease
  - efficientnet
  - tensorflow
  - keras
datasets:
  - devang03mgr/cattle-diseases-datasets
metrics:
  - accuracy
  - f1
  - roc_auc
---

# EfficientNet-B3 — Cattle Disease Detection

Fine-tuned **EfficientNet-B3** (ImageNet pre-trained) for multi-class cattle disease classification using a two-phase transfer learning strategy.

## Classes
| Index | Label |
|-------|-------|
| 0 | foot-and-mouth |
| 1 | healthy |
| 2 | lumpy |

## Model Architecture
- **Backbone:** EfficientNet-B3 (300×300×3 input)
- **Head:** GAP → BatchNorm → Dropout(0.3) → Dense(256, ReLU) → Dropout(0.2) → Softmax(3)
- **Loss:** Focal Loss (γ=2, α=0.25)
- **Optimizer:** AdamW + Cosine Annealing with Warm Restarts

## Training Details
| Parameter | Value |
|-----------|-------|
| Input size | 300×300 |
| Phase 1 epochs | 50 (frozen backbone) |
| Phase 2 epochs | 30 (top-3 blocks unfrozen) |
| Phase 1 LR | 1e-4 |
| Phase 2 LR | 1e-5 |
| Weight decay | 1e-4 |
| Early stopping | patience=7 (val_loss) |

## Test Set Performance
| Metric | Score |
|--------|-------|
| Accuracy | 0.9482 |
| Macro F1 | 0.9168 |
| Macro AUC-ROC | 0.9894 |

## Usage (TensorFlow / Keras)
```python
import keras

# Download the .keras file from the Hub and load:
model = keras.models.load_model(
    'efficientnet_b3_best.keras',
    custom_objects={
        'FocalLoss': FocalLoss,
        'EfficientNetPreprocess': EfficientNetPreprocess,
    }
)

# Predict (input: float32 numpy array of shape [N, 300, 300, 3] in [0, 255])
probs = model.predict(image_batch)   # shape (N, 3)
CLASS_NAMES = ['foot-and-mouth', 'healthy', 'lumpy']
predicted_class = CLASS_NAMES[probs.argmax(axis=1)[0]]
```

## Dataset
Trained on [devang03mgr/cattle-diseases-datasets](https://www.kaggle.com/datasets/devang03mgr/cattle-diseases-datasets).  
Stratified split: 70% train | 15% val | 15% test.

## Citation
If you use this model, please cite the original EfficientNet paper:
```
Tan, M., & Le, Q. V. (2019). EfficientNet: Rethinking Model Scaling for Convolutional
Neural Networks. ICML 2019. https://arxiv.org/abs/1905.11946
```
