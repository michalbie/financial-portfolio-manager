# Use Node.js LTS
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY ./package*.json ./
RUN npm install

# Build the Next.js app
RUN npm run build

# Expose Next.js port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"]
