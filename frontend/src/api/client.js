import axios from 'axios';

const api = axios.create({
  // Base URL ab relative hai, Vercel khud isko backend se jod dega
  baseURL: '/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;