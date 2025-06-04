class ApiService {
  constructor() {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.baseURL = isDevelopment ? 'http://localhost:3000' : 'http://localhost:3000';
    
    this.token = null;
    
    // Safely get token from localStorage
    try {
      this.token = localStorage.getItem('token');
    } catch (error) {
      console.warn('Could not access localStorage:', error);
    }
  }

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
    });

    try {
      const response = await fetch(url, config);
      
      console.log('🌐 API response status:', response.status, response.statusText);
      
      // Handle 401 Unauthorized - session expired
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired. Please log in again.');
      }
      
      const contentType = response.headers.get('content-type');
      let data = null;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse response JSON:', jsonError);
          throw new Error(`Invalid JSON response from server (status: ${response.status})`);
        }
      } else {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse);
        throw new Error(`Server returned non-JSON response (status: ${response.status}): ${textResponse}`);
      }

      if (!response.ok) {
        console.error('API error response:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        
        let errorMessage = data?.error || `HTTP error! status: ${response.status}`;
        
        if (data?.details && Array.isArray(data.details)) {
          const validationErrors = data.details.map(detail => detail.msg || detail.message || detail).join('; ');
          errorMessage += ` - Validation errors: ${validationErrors}`;
        }
        
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', {
        url,
        error: error.message,
        stack: error.stack?.split('\n')[0]
      });
      throw error;
    }
  }

  async register(username, password, role = 'user') {
    const response = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });

    if (response.accessToken) {
      this.token = response.accessToken;
      try {
        localStorage.setItem('token', response.accessToken);
      } catch (error) {
        console.warn('Could not save to localStorage:', error);
      }
    }

    return {
      ...response,
      token: response.accessToken, 
      username: response.user?.username,
      role: response.user?.role
    };
  }

  async login(username, password) {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.accessToken) {
      this.token = response.accessToken;
      try {
        localStorage.setItem('token', response.accessToken);
      } catch (error) {
        console.warn('Could not save to localStorage:', error);
      }
    }

    return {
      ...response,
      token: response.accessToken,
      username: response.user?.username,
      role: response.user?.role
    };
  }

  async verifyToken() {
    if (!this.token) {
      throw new Error('No token available');
    }

    return await this.request('/api/auth/token/verify', {
      method: 'POST',
      body: JSON.stringify({ token: this.token }),
    });
  }

  logout() {
    this.token = null;
    try {
      localStorage.removeItem('token');
    } catch (error) {
      console.warn('Could not clear localStorage:', error);
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  // Puzzle methods
  async getPuzzles(page = 1, limit = 10, difficulty = null) {
    let endpoint = `/api/puzzles?page=${page}&limit=${limit}`;
    if (difficulty) {
      endpoint += `&difficulty=${difficulty}`;
    }
    return await this.request(endpoint);
  }

  async getPuzzle(id) {
    return await this.request(`/api/puzzles/${id}`);
  }

  async createPuzzle(puzzleData) {
    return await this.request('/api/puzzles', {
      method: 'POST',
      body: JSON.stringify(puzzleData),
    });
  }

  async updatePuzzle(id, puzzleData) {
    return await this.request(`/api/puzzles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(puzzleData),
    });
  }

  async deletePuzzle(id) {
    return await this.request(`/api/puzzles/${id}`, {
      method: 'DELETE',
    });
  }

  async generatePuzzle(difficulty, save = true) {
    return await this.request('/api/puzzles/generate', {
      method: 'POST',
      body: JSON.stringify({ difficulty, save }),
    });
  }

  async solvePuzzle(id, requestData) {
    console.log('ApiService.solvePuzzle called with:', {
      id,
      requestDataType: typeof requestData,
      hasCurrentState: !!requestData?.currentState,
      hint: requestData?.hint
    });
    
    try {
      let cleanRequestData = null;
      
      if (requestData) {
        cleanRequestData = {};
        
        if (requestData.currentState) {
          if (!Array.isArray(requestData.currentState)) {
            throw new Error('currentState must be an array');
          }
          
          cleanRequestData.currentState = requestData.currentState.map(row => {
            if (!Array.isArray(row)) {
              throw new Error('Each row in currentState must be an array');
            }
            return row.map(cell => {
              const numCell = Number(cell);
              if (!Number.isInteger(numCell) || numCell < 0 || numCell > 9) {
                throw new Error(`Invalid cell value: ${cell} (type: ${typeof cell})`);
              }
              return numCell;
            });
          });
        }
        
        if (requestData.hint !== undefined) {
          cleanRequestData.hint = Boolean(requestData.hint);
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
      });
      
      const response = await this.request(`/api/puzzles/${id}/solve`, {
        method: 'POST',
        body: JSON.stringify(cleanRequestData),
      });
      
      console.log('solvePuzzle response:', response);
      return response;
      
    } catch (error) {
      console.error('solvePuzzle error:', {
        message: error.message,
        stack: error.stack?.split('\n')[0]
      });
      throw error;
    }
  }

  async validatePuzzle(id, currentState, move = null) {
    return await this.request(`/api/puzzles/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify({ currentState, move }),
    });
  }
}

const apiService = new ApiService();
export default apiService;