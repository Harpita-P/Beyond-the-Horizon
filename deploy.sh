#!/bin/bash

# Configuration
PROJECT_ID="beyondthehorizon-495923"
REGION="us-central1"
SERVICE_NAME="beyond-the-horizon"

# Create Cloud Build config
cat > cloudbuild.yaml <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}'
      - '--build-arg'
      - 'VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}'
      - '-t'
      - 'gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest'
      - '.'
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest'
images:
  - 'gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest'
EOF

# Build and deploy to Cloud Run
echo "Building Docker image..."
gcloud builds submit --config=cloudbuild.yaml .

echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080

echo "Deployment complete!"
echo "Service URL: https://${SERVICE_NAME}-${PROJECT_ID}.a.run.app"
