pipeline {
  agent any

  environment {
    IMAGE_NAME = 'todo-backend'
    IMAGE_TAG  = "${BUILD_NUMBER}"
  }

  stages {

    stage('Récupérer le code') {
      steps {
        echo 'Clonage du dépôt Git...'
        git branch: 'main',
            url: 'https://github.com/rabetsara/todo-list.git'
      }
    }

    stage('Construire la boîte Docker') {
      steps {
        echo 'Construction de l image Docker du backend...'
        sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
        sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest"
      }
    }

    stage('Lancer l environnement de test') {
      steps {
        echo 'Nettoyage des anciens conteneurs...'
        // ← AJOUT : on arrête tout ce qui tourne AVANT de démarrer
        sh 'docker-compose down --remove-orphans'

        echo 'Démarrage de tous les services...'
        sh 'docker-compose up -d'
        sh 'sleep 15'
      }
    }

    stage('Exécuter les tests') {
      steps {
        sh 'docker-compose exec -T backend node test.js'
      }
      post {
        always {
          // ← IMPORTANT : arrêter les conteneurs après les tests
          sh 'docker-compose down'
        }
      }
    }

    stage('Pousser l image sur le registry') {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'docker-hub-creds',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh "echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin"
          sh "docker push ${IMAGE_NAME}:${IMAGE_TAG}"
        }
      }
    }

    stage('Déployer en production') {
      when { branch 'main' }
      steps {
        echo 'Déploiement en production...'
        sh """
          ssh -o StrictHostKeyChecking=no user@mon-serveur.com '
            cd /opt/todo-app &&
            docker-compose down &&
            docker-compose pull &&
            docker-compose up -d
          '
        """
      }
    }
  }

  post {
    success {
      echo 'Pipeline réussi !'
    }
    failure {
      echo 'Le pipeline a échoué. Vérifiez les logs.'
      // Nettoyer même en cas d'échec
      sh 'docker-compose down --remove-orphans'
    }
    always {
      sh 'docker image prune -f'
    }
  }
}
