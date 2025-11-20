"""
CSV Parser with Claude API for intelligent parsing of bank statements.
Handles messy CSVs with header rows, footer rows, and various formats.
"""
import os
import json
from typing import Dict, List, Optional
from datetime import datetime
from anthropic import Anthropic


class CSVParser:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")
        self.client = Anthropic(api_key=self.api_key)

    def parse_csv_with_claude(self, csv_content: str, asset_id: Optional[int] = None) -> Dict:
        """
        Let Claude handle the entire CSV parsing intelligently.
        Claude will:
        1. Identify and skip header/footer rows
        2. Find the actual transaction data
        3. Detect column mappings
        4. Extract and aggregate transaction data

        Returns:
        {
            "date_start": "YYYY-MM-DD",
            "date_end": "YYYY-MM-DD", 
            "incomes": float,
            "expenses": float,
            "final_balance": float,
            "transaction_count": int,
            "currency": str
        }
        """

        # Truncate if too long (keep first 100 lines + last 20 lines for context)
        lines = csv_content.split('\n')
        if len(lines) > 150:
            csv_sample = '\n'.join(
                lines[:100] + ['...', '(middle rows omitted)', '...'] + lines[-20:])
        else:
            csv_sample = csv_content

            prompt = f"""You are analyzing a bank statement CSV file. The CSV may have:
                - Header rows with metadata/bank info
                - Column headers somewhere in the middle
                - Transaction rows
                - Footer rows with disclaimers
                - Empty rows

                Your task is to extract transaction data and calculate totals.

                CSV Content:
                ```csv
                {csv_sample}
                ```

                Instructions:
                1. Find the row with column headers (look for columns like: date, amount, balance, description, etc.)
                2. Identify all transaction rows (skip headers, footers, empty rows)
                3. For each transaction, extract:
                - Transaction date
                - Amount (could be positive/negative in one column, OR separate debit/credit columns)
                - Running balance (if available)
                - Description

                4. Calculate:
                - Earliest transaction date (date_start)
                - Latest transaction date (date_end)
                - Total incomes (positive amounts or credit column)
                - Total expenses (negative amounts or debit column, as POSITIVE numbers)
                - Final balance (from last transaction's balance, or calculate from first balance +/- all amounts)
                - Currency (e.g., PLN, USD, EUR)
                - Number of transactions

                Return ONLY a JSON object:
                {{
                "date_start": "YYYY-MM-DD",
                "date_end": "YYYY-MM-DD",
                "incomes": float,
                "expenses": float,
                "final_balance": float,
                "transaction_count": int,
                "currency": "PLN"
                }}

                CRITICAL RULES:
                - Return ONLY valid JSON, no markdown, no explanations
                - Expenses should be POSITIVE numbers (e.g., 100.00, not -100.00)
                - Incomes should be POSITIVE numbers
                - Dates in YYYY-MM-DD format
                - All amounts as floats (use . for decimals)
                - Skip any rows that are not actual transactions
                """

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = message.content[0].text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split('\n')
            # Find first line that's not a code fence
            start_idx = 1
            for i, line in enumerate(lines[1:], 1):
                if not line.strip().startswith('```') and line.strip():
                    start_idx = i
                    break
            # Find last line that's not a code fence
            end_idx = len(lines) - 1
            for i in range(len(lines) - 1, 0, -1):
                if not lines[i].strip().startswith('```') and lines[i].strip():
                    end_idx = i
                    break
            response_text = '\n'.join(lines[start_idx:end_idx + 1])

        try:
            parsed_data = json.loads(response_text)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Failed to parse Claude's response as JSON: {response_text[:200]}") from e

        # Validate required fields
        required_fields = ['date_start', 'date_end',
                           'incomes', 'expenses', 'final_balance']
        for field in required_fields:
            if field not in parsed_data:
                raise ValueError(
                    f"Missing required field in response: {field}")

        # Convert date strings to date objects
        try:
            parsed_data['date_start'] = datetime.strptime(
                parsed_data['date_start'], '%Y-%m-%d').date()
            parsed_data['date_end'] = datetime.strptime(
                parsed_data['date_end'], '%Y-%m-%d').date()
        except ValueError as e:
            raise ValueError(f"Invalid date format in response") from e

        # Add asset_id if provided
        parsed_data['asset_id'] = asset_id

        return parsed_data

    def parse_csv(self, csv_content: str, asset_id: Optional[int] = None) -> Dict:
        """
        Main entry point for CSV parsing.
        Uses Claude to intelligently parse the entire CSV.
        """
        return self.parse_csv_with_claude(csv_content, asset_id)
