// services/api.js - Fixed version
class ApiService {
  constructor() {
    // Fix: Use window.location for environment detection instead of process.env
    // For development, default to localhost:3000
    // For production, you can set this to your actual API URL
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.baseURL = isDevelopment ? 'http://localhost:3000/api' : 'http://localhost:3000/api';
    
    // Alternative: You can also hardcode it for now
    // this.baseURL = 'http://localhost:3000/api';
    
    this.token = null;
    
    // Safely get token from localStorage
    try {
      this.token = localStorage.getItem('token');
    } catch (error) {
      console.warn('Could not access localStorage:', error);
    }
  }

  // Helper method to make authenticated requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authentication header if token exists
    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async register(username, password) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.accessToken) {
      this.token = response.accessToken;
      try {
        localStorage.setItem('token', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
      } catch (error) {
        console.warn('Could not save to localStorage:', error);
      }
    }

    return response;
  }

  async login(username, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.accessToken) {
      this.token = response.accessToken;
      try {
        localStorage.setItem('token', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
      } catch (error) {
        console.warn('Could not save to localStorage:', error);
      }
    }

    return response;
  }

  async verifyToken() {
    if (!this.token) {
      throw new Error('No token available');
    }

    return await this.request('/auth/token/verify', {
      method: 'POST',
      body: JSON.stringify({ token: this.token }),
    });
  }

  async refreshToken() {
    let refreshToken = null;
    try {
      refreshToken = localStorage.getItem('refreshToken');
    } catch (error) {
      console.warn('Could not access localStorage:', error);
    }
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request('/auth/token/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (response.accessToken) {
      this.token = response.accessToken;
      try {
        localStorage.setItem('token', response.accessToken);
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
      } catch (error) {
        console.warn('Could not save to localStorage:', error);
      }
    }

    return response;
  }

  logout() {
    this.token = null;
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    } catch (error) {
      console.warn('Could not clear localStorage:', error);
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  // Puzzle methods
  async getPuzzles(page = 1, limit = 10, difficulty = null) {
    let endpoint = `/puzzles?page=${page}&limit=${limit}`;
    if (difficulty) {
      endpoint += `&difficulty=${difficulty}`;
    }
    return await this.request(endpoint);
  }

  async getPuzzle(id) {
    return await this.request(`/puzzles/${id}`);
  }

  async createPuzzle(puzzleData) {
    return await this.request('/puzzles', {
      method: 'POST',
      body: JSON.stringify(puzzleData),
    });
  }

  async updatePuzzle(id, puzzleData) {
    return await this.request(`/puzzles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(puzzleData),
    });
  }

  async deletePuzzle(id) {
    return await this.request(`/puzzles/${id}`, {
      method: 'DELETE',
    });
  }

  async generatePuzzle(difficulty, save = true) {
    return await this.request('/puzzles/generate', {
      method: 'POST',
      body: JSON.stringify({ difficulty, save }),
    });
  }

  async solvePuzzle(id, currentState = null, hint = false) {
    return await this.request(`/puzzles/${id}/solve`, {
      method: 'POST',
      body: JSON.stringify({ currentState, hint }),
    });
  }

  async validatePuzzle(id, currentState, move = null) {
    return await this.request(`/puzzles/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify({ currentState, move }),
    });
  }
}

const apiService = new ApiService();
export default apiService;