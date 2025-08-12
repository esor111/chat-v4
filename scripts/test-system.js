#!/usr/bin/env node

/**
 * System Test Script
 * 
 * This script tests the core functionality of the chat system
 * Run with: node scripts/test-system.js
 */

const http = require('http');
const https = require('https');

class SystemTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Chat System Tests...\n');

    // Phase 1: Health Checks
    await this.testHealthEndpoints();

    // Phase 2: Profile System
    await this.testProfileSystem();

    // Phase 3: Error Handling
    await this.testErrorHandling();

    // Summary
    this.printSummary();
  }

  async testHealthEndpoints() {
    console.log('📊 Testing Health Endpoints...');

    await this.test('Basic Health Check', async () => {
      const response = await this.makeRequest('/api/health');
      if (response.status !== 'healthy') {
        throw new Error(`Expected healthy status, got: ${response.status}`);
      }
      return 'Health endpoint returns healthy status';
    });

    await this.test('Detailed Health Check', async () => {
      const response = await this.makeRequest('/api/health/detailed');
      if (!response.dependencies) {
        throw new Error('Missing dependencies in detailed health check');
      }
      if (!response.dependencies.profiles) {
        throw new Error('Missing profiles dependency');
      }
      return `Found ${response.dependencies.profiles.total_users} users, ${response.dependencies.profiles.total_businesses} businesses`;
    });

    await this.test('Redis Health Check', async () => {
      const response = await this.makeRequest('/api/health/redis');
      // Redis might be down, so we just check the response structure
      if (!response.hasOwnProperty('status')) {
        throw new Error('Missing status in Redis health check');
      }
      return `Redis status: ${response.status}`;
    });

    console.log('');
  }

  async testProfileSystem() {
    console.log('👤 Testing Profile System...');

    // Note: These tests would require the profile endpoints to be exposed
    // For now, we test that the health check shows profile data
    await this.test('Profile System Available', async () => {
      const response = await this.makeRequest('/api/health/detailed');
      const profiles = response.dependencies.profiles;
      
      if (profiles.total_users === 0) {
        throw new Error('No users found in profile system');
      }
      if (profiles.total_businesses === 0) {
        throw new Error('No businesses found in profile system');
      }
      
      return `Profile system has ${profiles.total_users} users and ${profiles.total_businesses} businesses`;
    });

    console.log('');
  }

  async testErrorHandling() {
    console.log('⚠️  Testing Error Handling...');

    await this.test('404 for Non-existent Endpoint', async () => {
      try {
        await this.makeRequest('/api/nonexistent');
        throw new Error('Expected 404 error');
      } catch (error) {
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          return '404 error handled correctly';
        }
        throw error;
      }
    });

    console.log('');
  }

  async test(name, testFunction) {
    try {
      const result = await testFunction();
      this.results.push({ name, status: 'PASS', message: result });
      console.log(`✅ ${name}: ${result}`);
    } catch (error) {
      this.results.push({ name, status: 'FAIL', message: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  async makeRequest(path) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      
      http.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
              return;
            }
            
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });
    });
  }

  printSummary() {
    console.log('📋 Test Summary:');
    console.log('================');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    }

    console.log('\n🎯 Next Steps:');
    if (failed === 0) {
      console.log('✅ All basic tests passed! Your system is ready for more advanced testing.');
      console.log('📖 Check TESTING_GUIDE.md for comprehensive testing instructions.');
    } else {
      console.log('⚠️  Some tests failed. Please check the application logs and fix issues.');
      console.log('🔧 Make sure the application is running: npm run start:dev');
    }
  }
}

// Check if application is running
async function checkApplicationRunning() {
  try {
    const response = await new Promise((resolve, reject) => {
      http.get('http://localhost:3000/api/health', (res) => {
        resolve(res.statusCode);
      }).on('error', reject);
    });
    return response === 200;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if application is running...');
  
  const isRunning = await checkApplicationRunning();
  if (!isRunning) {
    console.log('❌ Application is not running on http://localhost:3000');
    console.log('🚀 Please start the application first: npm run start:dev');
    process.exit(1);
  }

  console.log('✅ Application is running!\n');

  const tester = new SystemTester();
  await tester.runAllTests();
}

// Run the tests
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test script failed:', error.message);
    process.exit(1);
  });
}

module.exports = SystemTester;