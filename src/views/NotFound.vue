<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <p class="text-xl text-gray-600 mb-8">Page Not Found</p>
      <router-link 
        to="/" 
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Return to Dashboard
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// No additional setup needed for this simple component
</script>