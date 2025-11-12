// src/controllers/paymentController.js - VERSION AMÉLIORÉE
const Transaction = require('../models/Transaction');
const MeSombService = require('../services/mesombOfficialService');
const NotificationService = require('../services/notificationService');
const { v4: uuidv4 } = require('uuid');

class PaymentController {
  async initiatePayment(req, res) {
    try {
      const { amount, customer_phone, operator, merchant_id, metadata } = req.body;

      // ✅ AJOUT: Logs détaillés pour debug
      console.log('📥 Données reçues par le backend:', {
        amount, 
        customer_phone, 
        operator, 
        merchant_id,
        metadata
      });

      // ✅ AJOUT: Validation manuelle supplémentaire
      // ⚠️ TEST: 100 FCFA - REMETTRE 10000 EN PRODUCTION
      if (amount < 100) { // ⚠️ TEST: 100 → 10000 EN PROD
        return res.status(400).json({
          success: false,
          message: 'Le montant minimum est de 100 FCFA' // ⚠️ TEST: 100 → 10000 EN PROD
        });
      }

      const reference = `TX-${uuidv4().substring(0, 8).toUpperCase()}`;
      const transaction = new Transaction({
        reference,
        amount,
        customer_phone,
        operator,
        merchant_id,
        metadata: metadata || {},
        status: 'PENDING'
      });
      await transaction.save();

      console.log(`💰 Paiement initié: ${reference} - ${amount}F - ${customer_phone}`);

      // Envoyer SMS de confirmation
      await NotificationService.sendPaymentConfirmation(customer_phone, amount, reference);

      // Appel MeSomb pour initier le paiement
      const paymentResult = await MeSombService.makePayment(amount, customer_phone, operator);

      console.log('📡 Résultat MeSomb reçu:', paymentResult);

      if (!paymentResult.success) {
        // Échec d'initiation
        await Transaction.findByIdAndUpdate(transaction._id, {
          status: 'FAILED',
          metadata: { 
            ...metadata, 
            error: paymentResult.error,
            mesomb_error: true
          }
        });
        
        await NotificationService.sendPaymentFailure(customer_phone, amount, reference, paymentResult.error);
        
        return res.status(400).json({ 
          success: false, 
          message: 'Échec de l\'initiation du paiement', 
          error: paymentResult.error 
        });
      }

      // ✅ CORRECTION: Gestion robuste de l'ID de transaction
      const mesombTransactionId = paymentResult.data.transactionId || 
                                 paymentResult.data.transaction_id ||
                                 paymentResult.data.transaction?.pk;

      if (!mesombTransactionId) {
        console.warn('⚠️ Aucun ID de transaction MeSomb reçu');
      }

      // Sauvegarder l'ID MeSomb
      await Transaction.findByIdAndUpdate(transaction._id, {
        mesomb_transaction_id: mesombTransactionId
      });

      console.log(`✅ Transaction ${reference} sauvegardée avec ID MeSomb: ${mesombTransactionId}`);

      res.status(200).json({
        success: true,
        message: 'Paiement initié – confirmez sur votre téléphone',
        data: {
          reference,
          transaction_id: mesombTransactionId,
          status: 'PENDING'
        }
      });

    } catch (error) {
      console.error('❌ Erreur critique dans initiatePayment:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // 🔒 Lecture seule du statut (ne PAS appeler MeSomb ici)
  async checkPaymentStatus(req, res) {
    try {
      const { reference } = req.params;
      const transaction = await Transaction.findOne({ reference });
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction introuvable' });
      }

      res.status(200).json({
        success: true,
        data: {
          reference: transaction.reference,
          amount: transaction.amount,
          status: transaction.status,
          operator: transaction.operator,
          created_at: transaction.createdAt
        }
      });
    } catch (error) {
      console.error('❌ Erreur checkPaymentStatus:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async getMerchantTransactions(req, res) {
    try {
      const { merchant_id } = req.params;
      const transactions = await Transaction.find({ merchant_id })
        .sort({ createdAt: -1 })
        .limit(20);
      res.json({ success: true, data: { transactions } });
    } catch (error) {
      console.error('❌ Erreur getMerchantTransactions:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }
}

module.exports = new PaymentController();