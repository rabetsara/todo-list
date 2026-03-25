// ── Jenkinsfile ───────────────────────────────────────────────
// Pipeline CI/CD complet pour la Todo App

pipeline {

  agent any   // utilise n'importe quel serveur Jenkins disponible

  // Variables disponibles dans tout le pipeline
  environment {
    IMAGE_NAME    = 'todo-backend'
    IMAGE_TAG     = "${BUILD_NUMBER}"   // ex: todo-backend:42
    REGISTRY      = 'registry.hub.docker.com/moncompte'
  }

  stages {

    // ── ÉTAPE 1 ─────────────────────────────────────────────
    stage('Récupérer le code') {
      steps {
        echo 'Clonage du dépôt Git...'
        git branch: 'main',
            url: 'https://https://github.com/rabetsara/todo-list.git'
      }
    }

    // ── ÉTAPE 2 ─────────────────────────────────────────────
    stage('Construire la boîte Docker') {
      steps {
        echo 'Construction de l image Docker du backend...'
        // Lit le Dockerfile et fabrique l'image
        sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
        sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest"
      }
    }

    // ── ÉTAPE 3 ─────────────────────────────────────────────
    stage('Lancer l environnement de test') {
      steps {
        echo 'Démarrage de tous les services avec docker-compose...'
        // Lit docker-compose.yml et lance frontend + backend + postgres
        sh 'docker-compose up -d'

        // Attendre que le backend soit vraiment prêt (max 30 secondes)
        sh 'sleep 10'
      }
    }

    // ── ÉTAPE 4 ─────────────────────────────────────────────
    stage('Exécuter les tests') {
      steps {
        echo 'Lancement des tests...'
        // Exécute backend/test.js à l'intérieur du conteneur backend
        sh 'docker-compose exec -T backend node test.js'
      }
      post {
        // Que les tests réussissent ou échouent, on arrête les conteneurs
        always {
          sh 'docker-compose down'
        }
      }
    }

    // ── ÉTAPE 5 ─────────────────────────────────────────────
    stage('Pousser l image sur le registry') {
      // Cette étape s'exécute SEULEMENT si on est sur la branche main
      when {
        branch 'main'
      }
      steps {
        echo 'Envoi de l image Docker sur le registry...'
        // Utilise les identifiants Docker stockés dans Jenkins (jamais en clair)
        withCredentials([usernamePassword(
          credentialsId: 'docker-hub-creds',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh "echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin"
          sh "docker push ${IMAGE_NAME}:${IMAGE_TAG}"
          sh "docker push ${IMAGE_NAME}:latest"
        }
      }
    }

    // ── ÉTAPE 6 ─────────────────────────────────────────────
    stage('Déployer en production') {
      when {
        branch 'main'
      }
      steps {
        echo 'Déploiement sur le serveur de production...'
        // Se connecte au serveur via SSH et met à jour les conteneurs
        sh """
          ssh -o StrictHostKeyChecking=no user@mon-serveur.com '
            cd /opt/todo-app &&
            docker-compose pull &&
            docker-compose up -d --no-build
          '
        """
      }
    }

  }

  // ── NOTIFICATIONS ──────────────────────────────────────────
  post {
    success {
      echo 'Déploiement réussi !'
      // slackSend message: "✅ Todo App version ${BUILD_NUMBER} déployée !"
    }
    failure {
      echo 'Le pipeline a échoué. Vérifiez les logs.'
      // slackSend message: "❌ Échec du pipeline build #${BUILD_NUMBER}"
    }
    always {
      // Nettoyer les images Docker inutiles pour libérer de l'espace
      sh 'docker image prune -f'
    }
  }

}
