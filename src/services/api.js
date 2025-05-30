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

  // Fixed solvePuzzle method for ApiService class
  async solvePuzzle(id, requestData) {
    console.log('🔄 ApiService.solvePuzzle called with:', {
      id,
      requestDataType: typeof requestData,
      hasCurrentState: !!requestData?.currentState,
      hint: requestData?.hint
    })
    
    try {
      // CRITICAL FIX: Ensure we're sending clean, serializable data
      let cleanRequestData = null
      
      if (requestData) {
        // Create a completely clean object
        cleanRequestData = {}
        
        // Handle currentState
        if (requestData.currentState) {
          if (!Array.isArray(requestData.currentState)) {
            throw new Error('currentState must be an array')
          }
          
          // Create a completely new, clean array
          cleanRequestData.currentState = requestData.currentState.map(row => {
            if (!Array.isArray(row)) {
              throw new Error('Each row in currentState must be an array')
            }
            return row.map(cell => {
              // Ensure each cell is a clean integer
              const numCell = Number(cell)
              if (!Number.isInteger(numCell) || numCell < 0 || numCell > 9) {
                throw new Error(`Invalid cell value: ${cell} (type: ${typeof cell})`)
              }
              return numCell
            })
          })
        }
        
        // Handle hint flag
        if (requestData.hint !== undefined) {
          cleanRequestData.hint = Boolean(requestData.hint)
        }
      }
      
      console.log('🔄 Sending clean request data:', {
        id,
        cleanDataType: typeof cleanRequestData,
        hasCurrentState: !!cleanRequestData?.currentState,
        currentStateLength: cleanRequestData?.currentState?.length,
        firstRowLength: cleanRequestData?.currentState?.[0]?.length,
        hint: cleanRequestData?.hint,
        sampleCells: cleanRequestData?.currentState?.[0]?.slice(0, 3)
      })
      
      // Make the request with clean data
      const response = await this.request(`/puzzles/${id}/solve`, {
        method: 'POST',
        body: JSON.stringify(cleanRequestData),
      })
      
      console.log('✅ solvePuzzle response:', response)
      return response
      
    } catch (error) {
      console.error('❌ solvePuzzle error:', {
        message: error.message,
        stack: error.stack?.split('\n')[0]
      })
      throw error
    }
  }

  // Alternative: You can also replace the entire request method to add better error handling
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

    console.log('🌐 Making API request:', {
      url,
      method: config.method || 'GET',
      hasBody: !!config.body,
      bodyLength: config.body?.length,
      headers: Object.keys(config.headers)
    })

    try {
      const response = await fetch(url, config);
      
      console.log('🌐 API response status:', response.status, response.statusText)
      
      let data
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('❌ Failed to parse response JSON:', jsonError)
        throw new Error(`Invalid JSON response from server (status: ${response.status})`)
      }

      if (!response.ok) {
        console.error('❌ API error response:', {
          status: response.status,
          statusText: response.statusText,
          data
        })
        
        // Extract more specific error information
        let errorMessage = data.error || `HTTP error! status: ${response.status}`
        
        if (data.details && Array.isArray(data.details)) {
          const validationErrors = data.details.map(detail => detail.msg || detail.message || detail).join('; ')
          errorMessage += ` - Validation errors: ${validationErrors}`
        }
        
        if (data.receivedBody) {
          console.error('❌ Server received body:', data.receivedBody)
        }
        
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('❌ API request failed:', {
        url,
        error: error.message,
        stack: error.stack?.split('\n')[0]
      })
      throw error;
    }
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